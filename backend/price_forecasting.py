import os
import threading
import time
from datetime import date, timedelta

import joblib
import numpy as np
import pandas as pd

import price_features as pf
import weather_history

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRICE_COL = pf.PRICE_COL
MIN_HISTORY = pf.MIN_HISTORY
RAIN_FEATURES = ["rain_1d", "rain_3d", "rain_7d"]

df = daily_series = commodity_models = le_state = le_district = features = None
shrink = {}
weather_daily = coords = climatology = None
known_states = known_districts = set()

_forecast_cache = {}
_forecast_lock = threading.Lock()
FORECAST_TTL = 3 * 3600


def load():
    """(Re)load prices, weather and models, e.g. after agmarknet_sync + retraining."""
    global df, daily_series, commodity_models, le_state, le_district, features, shrink
    global weather_daily, coords, climatology, known_states, known_districts

    package = joblib.load(os.path.join(BASE_DIR, "commodity_price_model.joblib"))
    data = pd.read_csv(os.path.join(BASE_DIR, "cleaned_combine_wsrjc.csv"))
    data["date"] = pd.to_datetime(data[["year", "month", "day"]])

    # One cleaned price per district per day, kept as lists for fast lookups
    daily = pf.daily_prices(data)
    series = {
        key: list(zip(g["date"], g[PRICE_COL].astype(float)))
        for key, g in daily.groupby(pf.KEYS, sort=False)
    }

    weather = weather_history.load_weather()
    clim = None
    if weather is not None:
        wf = pf.weather_features(weather)
        wf["month"] = wf["date"].dt.month
        # typical rain for a district in a month, used beyond the 16-day forecast
        clim = wf.groupby(["State Name", "District Name", "month"])[pf.WEATHER_FEATURES].mean()

    # Swap everything in together so requests never see half-loaded state
    df, daily_series = data, series
    commodity_models = package["models"]
    feats = package["features"]
    features = feats if isinstance(feats, dict) else {c: feats for c in commodity_models}
    le_state, le_district = package["le_state"], package["le_district"]
    shrink = package.get("shrink", {})
    weather_daily, coords, climatology = weather, weather_history.load_coords(), clim
    known_states, known_districts = set(le_state.classes_), set(le_district.classes_)
    with _forecast_lock:
        _forecast_cache.clear()


load()


def get_price_options():
    """
    State -> district -> commodities that the model can actually forecast
    (known to the encoders and with enough history).
    """
    options = {}
    for (state, district, commodity), prices in daily_series.items():
        if len(prices) < MIN_HISTORY or commodity not in commodity_models:
            continue
        if state not in known_states or district not in known_districts:
            continue
        options.setdefault(state, {}).setdefault(district, []).append(commodity)
    return {
        "options": {s: {d: sorted(c) for d, c in sorted(ds.items())} for s, ds in sorted(options.items())},
        "commodities": sorted(commodity_models.keys()),
        "data_start": df["date"].min().date().isoformat(),
        "data_end": df["date"].max().date().isoformat(),
    }


# ---------------------------------------------------------------- weather

def _forecast(state, district):
    """Open-Meteo last 30 + next 16 days for the district (cached for a few hours)."""
    point = coords.get((state, district)) if coords else None
    if not point:
        return None
    key = (state, district)
    with _forecast_lock:
        hit = _forecast_cache.get(key)
        if hit and time.time() - hit[0] < FORECAST_TTL:
            return hit[1]
    try:
        frame = weather_history.forecast_daily(*point)
    except Exception:
        return None
    with _forecast_lock:
        _forecast_cache[key] = (time.time(), frame)
    return frame


def _weather_rows(state, district, days):
    """Weather features for each requested day + where the numbers came from."""
    first, last = min(days) - timedelta(days=40), max(days)
    frame = pd.DataFrame(columns=["rain_mm", "tmax"], dtype=float)
    if weather_daily is not None:
        w = weather_daily[(weather_daily["State Name"] == state) & (weather_daily["District Name"] == district)]
        w = w[(w["date"] >= first) & (w["date"] <= last)]
        frame = w.set_index("date")[["rain_mm", "tmax"]]

    sources = {}
    today = pd.Timestamp(date.today())
    if last >= today - timedelta(days=10):
        fc = _forecast(state, district)
        if fc is not None:
            frame = frame.combine_first(fc)  # recorded data wins, forecast fills the rest

    if len(frame):
        frame = frame.rename_axis("date").reset_index()
        frame.insert(0, "District Name", district)
        frame.insert(0, "State Name", state)
        feats = pf.weather_features(frame).set_index("date")
    else:
        feats = pd.DataFrame()

    rows = []
    for day in days:
        row = feats.loc[day, pf.WEATHER_FEATURES].to_dict() if day in feats.index else {}
        if not row or pd.isna(row.get("rain_1d")):
            row = {}
            if climatology is not None and (state, district, day.month) in climatology.index:
                row = climatology.loc[(state, district, day.month)].to_dict()
                sources[day] = "seasonal average"
            else:
                row = {c: np.nan for c in pf.WEATHER_FEATURES}
                sources[day] = "unavailable"
        else:
            sources[day] = "forecast" if day >= today else "recorded"
        rows.append(row)
    return rows, sources


# ---------------------------------------------------------------- prediction

def _predict(commodity, base, weather_row):
    x = pd.DataFrame([{**base, **weather_row}])[features[commodity]]
    change = float(commodity_models[commodity].predict(x)[0]) * shrink.get(commodity, 1.0)
    change = float(np.clip(change, -pf.MAX_LOG_CHANGE, pf.MAX_LOG_CHANGE))
    return base["lag_1"] * float(np.exp(change))


def predict_commodity_price(state, district, commodity, date_input, horizon=7):
    """
    Predict the modal price for a date plus a day-by-day outlook (each day
    feeds the next). Uses recorded / forecast rain for the district and also
    reports how much of the change is due to rain (vs. a dry day).
    """
    date_input = pd.Timestamp(pd.to_datetime(date_input).date())

    if commodity not in commodity_models:
        return {"error": "Model not available for this commodity"}
    if state not in known_states or district not in known_districts:
        return {"error": "The model was not trained on this district"}

    prices = [p for p in daily_series.get((state, district, commodity), []) if p[0] < date_input]
    if len(prices) < MIN_HISTORY:
        return {"error": "Not enough historical data"}

    encoded = {
        "State_enc": int(le_state.transform([state])[0]),
        "District_enc": int(le_district.transform([district])[0]),
    }
    days = [date_input + timedelta(days=i) for i in range(max(1, horizon))]
    uses_rain = any(c in features[commodity] for c in RAIN_FEATURES)
    weather_rows, sources = _weather_rows(state, district, days)

    outlook = []
    for day, weather_row in zip(days, weather_rows):
        base = {**encoded, **pf.series_features(prices, day)}
        price = _predict(commodity, base, weather_row)
        rain_effect = None
        if uses_rain:
            dry = {**weather_row, **{c: 0.0 for c in RAIN_FEATURES}}
            rain_effect = round(price - _predict(commodity, base, dry), 2)
        rain_1d, rain_3d = weather_row.get("rain_1d"), weather_row.get("rain_3d")
        outlook.append({
            "date": day.date().isoformat(),
            "price": round(price, 2),
            "rain_mm": None if pd.isna(weather_row.get("rain_1d")) else round(float(weather_row["rain_1d"]), 1),
            "rain_7d_mm": None if pd.isna(weather_row.get("rain_7d")) else round(float(weather_row["rain_7d"]), 1),
            "rain_effect": rain_effect,
            "heavy_rain": bool((pd.notna(rain_1d) and rain_1d >= pf.HEAVY_RAIN_1D)
                               or (pd.notna(rain_3d) and rain_3d >= pf.HEAVY_RAIN_3D)),
            "weather_source": sources[day],
        })
        prices.append((day, price))

    history = [p for p in daily_series[(state, district, commodity)] if p[0] < date_input][-30:]
    last_date, last_price = history[-1]

    return {
        "predicted_price": outlook[0]["price"],
        "rain_mm": outlook[0]["rain_mm"],
        "rain_7d_mm": outlook[0]["rain_7d_mm"],
        "rain_effect": outlook[0]["rain_effect"],
        "rain_in_model": uses_rain,
        "heavy_rain": outlook[0]["heavy_rain"],
        "heavy_rain_days": [p["date"] for p in outlook if p["heavy_rain"] and p["weather_source"] != "seasonal average"],
        "weather_source": outlook[0]["weather_source"],
        "outlook": outlook,
        "history": [{"date": d.date().isoformat(), "price": round(float(p), 2)} for d, p in history],
        "last_known_price": round(float(last_price), 2),
        "last_data_date": last_date.date().isoformat(),
        "days_since_data": int((date_input - last_date).days),
    }
