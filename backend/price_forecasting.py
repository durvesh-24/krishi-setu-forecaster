import os
from datetime import timedelta

import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRICE_COL = "Modal Price (Rs./Quintal)"
MIN_HISTORY = 7

# Load model package and data
model_package = joblib.load(os.path.join(BASE_DIR, "commodity_price_model.joblib"))
df = pd.read_csv(os.path.join(BASE_DIR, "cleaned_combine_wsrjc.csv"))
df["date"] = pd.to_datetime(df[["year", "month", "day"]])
df = df.sort_values("date", kind="stable")

# Extract components from model package
commodity_models = model_package["models"]
le_state = model_package["le_state"]
le_district = model_package["le_district"]
features = model_package["features"]

known_states = set(le_state.classes_)
known_districts = set(le_district.classes_)


def _series(state, district, commodity):
    return df[
        (df["State Name"] == state)
        & (df["District Name"] == district)
        & (df["Commodity"] == commodity)
    ]


def get_price_options():
    """
    State -> district -> commodities that the model can actually forecast
    (known to the encoders and with enough history).
    """
    counts = df.groupby(["State Name", "District Name", "Commodity"]).size()
    options = {}
    for (state, district, commodity), n in counts.items():
        if n < MIN_HISTORY or commodity not in commodity_models:
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


def _predict_one(model, state_enc, district_enc, prices, date_input):
    """Predict one day using the same features the model was trained on."""
    input_data = pd.DataFrame([{
        "State_enc": state_enc,
        "District_enc": district_enc,
        "lag_1": prices[-1],
        "lag_7": prices[-7],
        "rolling_7": sum(prices[-7:]) / 7,
        "day_of_week": date_input.dayofweek,
        "month": date_input.month,
        "quarter": (date_input.month - 1) // 3 + 1,
    }])[features]
    return float(model.predict(input_data)[0])


def predict_commodity_price(state, district, commodity, date_input, horizon=7):
    """
    Predict commodity price based on state, district, commodity, and date.
    Also returns a short day-by-day outlook (each day feeds the next one)
    and the recent price history for charting.
    """
    date_input = pd.to_datetime(date_input)

    if commodity not in commodity_models:
        return {"error": "Model not available for this commodity"}
    if state not in known_states or district not in known_districts:
        return {"error": "The model was not trained on this district"}

    model = commodity_models[commodity]
    series = _series(state, district, commodity)
    history = series[series["date"] < date_input]

    if len(history) < MIN_HISTORY:
        return {"error": "Not enough historical data"}

    state_enc = le_state.transform([state])[0]
    district_enc = le_district.transform([district])[0]

    prices = history[PRICE_COL].astype(float).tolist()
    outlook = []
    for i in range(max(1, horizon)):
        day = date_input + timedelta(days=i)
        price = _predict_one(model, state_enc, district_enc, prices, day)
        outlook.append({"date": day.date().isoformat(), "price": round(price, 2)})
        prices.append(price)

    recent = (
        history.groupby("date")[PRICE_COL].mean().tail(30).round(2)
    )
    last_date = history["date"].max()

    return {
        "predicted_price": outlook[0]["price"],
        "outlook": outlook,
        "history": [{"date": d.date().isoformat(), "price": float(p)} for d, p in recent.items()],
        "last_known_price": round(float(history[PRICE_COL].iloc[-1]), 2),
        "last_data_date": last_date.date().isoformat(),
        "days_since_data": int((date_input - last_date).days),
    }
