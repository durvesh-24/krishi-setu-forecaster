"""
Features shared by training (train_price_model.py) and prediction
(price_forecasting.py), so both always compute them the same way.

Prices: one value per district per day = median modal price of all its mandis
that day. Mixing every mandi row (different qualities) made the series jumpy.

Weather: rainfall on the day and the days before it, so the model learns how
rain moves prices (e.g. heavy rain -> fewer arrivals / quality drop).
"""

import numpy as np
import pandas as pd

PRICE_COL = "Modal Price (Rs./Quintal)"
KEYS = ["State Name", "District Name", "Commodity"]

PRICE_FEATURES = [
    "lag_1", "lag_2", "lag_3", "lag_7",
    "rolling_7", "rolling_30", "std_7", "gap_days",
]
CALENDAR_FEATURES = ["day_of_week", "month", "day_of_year"]
WEATHER_FEATURES = ["rain_1d", "rain_3d", "rain_7d", "rain_30d", "tmax_1d"]
BASE_FEATURES = ["State_enc", "District_enc"] + PRICE_FEATURES + CALENDAR_FEATURES
FEATURES = BASE_FEATURES + WEATHER_FEATURES  # rain is kept for a crop only if it improves accuracy
HEAVY_RAIN_1D, HEAVY_RAIN_3D = 20.0, 40.0  # mm
MIN_HISTORY = 7
MAX_LOG_CHANGE = 0.5  # the model predicts log(price / last price), limited to about -40% .. +65%


def clean_prices(df):
    """Drop obvious data-entry errors (e.g. wheat at Rs 38,000 instead of Rs 2,500):
    rows more than 2.5x away from their district's typical price, or from the
    commodity's normal range."""
    df = df[df[PRICE_COL] > 0]
    series_median = df.groupby(KEYS)[PRICE_COL].transform("median")
    ratio = df[PRICE_COL] / series_median
    low = df.groupby("Commodity")[PRICE_COL].transform(lambda s: s.quantile(0.005))
    high = df.groupby("Commodity")[PRICE_COL].transform(lambda s: s.quantile(0.995))
    keep = ratio.between(1 / 2.5, 2.5) & df[PRICE_COL].between(low / 1.5, high * 1.5)
    return df[keep]


def daily_prices(df):
    """One row per (state, district, commodity, date) with the median modal price."""
    if "date" not in df:
        df = df.assign(date=pd.to_datetime(df[["year", "month", "day"]]))
    df = clean_prices(df)
    out = df.groupby(KEYS + ["date"], sort=True)[PRICE_COL].median().reset_index()
    return out


def add_price_features(daily):
    """Lag / rolling features from earlier days of the same series (no peeking)."""
    daily = daily.sort_values(KEYS + ["date"]).copy()
    g = daily.groupby(KEYS, sort=False)[PRICE_COL]
    prev = g.shift(1)
    daily["lag_1"] = prev
    daily["lag_2"] = g.shift(2)
    daily["lag_3"] = g.shift(3)
    daily["lag_7"] = g.shift(7)
    grouped_prev = prev.groupby([daily[k] for k in KEYS], sort=False)
    daily["rolling_7"] = grouped_prev.transform(lambda s: s.rolling(7).mean())
    daily["rolling_30"] = grouped_prev.transform(lambda s: s.rolling(30, min_periods=7).mean())
    daily["std_7"] = grouped_prev.transform(lambda s: s.rolling(7).std())
    daily["gap_days"] = daily.groupby(KEYS, sort=False)["date"].diff().dt.days
    return daily


def add_calendar_features(df):
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["day_of_year"] = df["date"].dt.dayofyear
    return df


def weather_features(weather):
    """Rolling rain sums per district from daily rows (State Name, District Name, date, rain_mm, tmax)."""
    if weather is None or weather.empty:
        return None
    w = weather.sort_values(["State Name", "District Name", "date"]).copy()
    w = w.set_index("date")
    parts = []
    for (state, district), d in w.groupby(["State Name", "District Name"], sort=False):
        d = d.asfreq("D")  # make sure missing days are explicit
        rain = d["rain_mm"]
        parts.append(pd.DataFrame({
            "State Name": state,
            "District Name": district,
            "rain_1d": rain,
            "rain_3d": rain.rolling(3, min_periods=2).sum(),
            "rain_7d": rain.rolling(7, min_periods=5).sum(),
            "rain_30d": rain.rolling(30, min_periods=20).sum(),
            "tmax_1d": d["tmax"],
        }, index=d.index))
    return pd.concat(parts).rename_axis("date").reset_index()


def attach_weather(df, wf):
    if wf is None:
        for c in WEATHER_FEATURES:
            df[c] = np.nan
        return df
    return df.merge(wf, on=["State Name", "District Name", "date"], how="left")


def series_features(prices, day):
    """Price features for predicting `day` from the earlier prices of one series (list of (date, price))."""
    values = [p for _, p in prices]
    last_date = prices[-1][0]
    window7 = values[-7:]
    window30 = values[-30:]
    return {
        "lag_1": values[-1],
        "lag_2": values[-2],
        "lag_3": values[-3],
        "lag_7": values[-7],
        "rolling_7": float(np.mean(window7)),
        "rolling_30": float(np.mean(window30)),
        "std_7": float(np.std(window7, ddof=1)),
        "gap_days": (day - last_date).days,
        "day_of_week": day.dayofweek,
        "month": day.month,
        "day_of_year": day.dayofyear,
    }
