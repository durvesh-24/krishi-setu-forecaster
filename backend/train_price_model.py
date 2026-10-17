"""
Train the mandi price models: one separate XGBoost model per commodity
(Wheat, Rice, Jowar, Cotton, Sugarcane).

Data:     cleaned_combine_wsrjc.csv (Agmarknet mandi prices)
        + district_weather.csv     (daily rain / temperature per district)

Each district's prices are turned into one price per day (median of its
mandis), then every day is predicted from the days before it plus the rain
around that day. See price_features.py for the exact features.

The model predicts the change from the last known price
(target = log(price / lag_1)) and the app converts it back. This keeps forecasts
close to the current market level instead of drifting.

Run:  python train_price_model.py
"""

import json
import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor

import price_features as pf
import weather_history

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "cleaned_combine_wsrjc.csv")
MODEL_PATH = os.path.join(BASE_DIR, "commodity_price_model.joblib")
METRICS_PATH = os.path.join(BASE_DIR, "price_model_metrics.json")

MODEL_PARAMS = dict(
    n_estimators=800,
    max_depth=7,
    learning_rate=0.03,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,
    objective="reg:absoluteerror",  # robust to the odd wrong price in the data
    random_state=42,
    n_jobs=-1,
)
SHRINK_STEPS = (0.0, 0.25, 0.5, 0.75, 1.0)
VALIDATION_SHARE = 0.15  # most recent 15% of days are held out to measure accuracy


def build_training_frame(raw, weather=None):
    daily = pf.daily_prices(raw)
    daily = pf.add_price_features(daily)
    daily = pf.add_calendar_features(daily)
    daily = pf.attach_weather(daily, pf.weather_features(weather))
    daily = daily.dropna(subset=["lag_1", "lag_2", "lag_3", "lag_7", "rolling_7", "std_7"])
    change = np.log(daily[pf.PRICE_COL] / daily["lag_1"])
    daily["target"] = change.clip(-pf.MAX_LOG_CHANGE, pf.MAX_LOG_CHANGE)
    return daily


def to_price(log_change, last_price):
    return np.asarray(last_price) * np.exp(np.clip(log_change, -pf.MAX_LOG_CHANGE, pf.MAX_LOG_CHANGE))


def _score(actual, pred):
    actual, pred = np.asarray(actual), np.asarray(pred)
    return {
        "mae": round(float(mean_absolute_error(actual, pred)), 2),
        "mape_percent": round(float(np.mean(np.abs((actual - pred) / actual)) * 100), 2),
        "r2": round(float(r2_score(actual, pred)), 4),
    }


def train(csv_path=CSV_PATH, model_path=MODEL_PATH, metrics_path=METRICS_PATH, features=None, verbose=True):
    features = features or pf.FEATURES
    raw = pd.read_csv(csv_path)
    raw["date"] = pd.to_datetime(raw[["year", "month", "day"]])
    weather = weather_history.load_weather()

    le_state = LabelEncoder().fit(raw["State Name"])
    le_district = LabelEncoder().fit(raw["District Name"])
    le_commodity = LabelEncoder().fit(raw["Commodity"])

    df = build_training_frame(raw, weather)
    df["State_enc"] = le_state.transform(df["State Name"])
    df["District_enc"] = le_district.transform(df["District Name"])

    cutoff = df["date"].quantile(1 - VALIDATION_SHARE)
    models, metrics, shrinks, crop_features = {}, {}, {}, {}
    candidates = {"without rain": pf.BASE_FEATURES, "with rain": features}

    for commodity, data in df.groupby("Commodity"):
        is_train = data["date"] < cutoff
        test = data[~is_train]
        result = {"days_of_prices": int(len(data)), "districts": int(data["District Name"].nunique())}
        chosen = "without rain"

        if is_train.sum() > 50 and (~is_train).sum() > 10:
            actual = test[pf.PRICE_COL].to_numpy()
            heavy = ((test["rain_1d"] >= pf.HEAVY_RAIN_1D) | (test["rain_3d"] >= pf.HEAVY_RAIN_3D)).to_numpy()
            scored = {}
            for name, cols in candidates.items():
                check = XGBRegressor(**MODEL_PARAMS).fit(data.loc[is_train, cols], data.loc[is_train, "target"])
                raw_change = check.predict(test[cols])
                # How much of the predicted change to trust: pick the factor that
                # gives the smallest error on the held-out days (1 = all of it)
                shrink = min(SHRINK_STEPS, key=lambda a: mean_absolute_error(
                    actual, to_price(raw_change * a, test["lag_1"])))
                pred = to_price(raw_change * shrink, test["lag_1"])
                scored[name] = {
                    "shrink": shrink,
                    **_score(actual, pred),
                    "heavy_rain_mae": round(float(np.mean(np.abs(actual[heavy] - pred[heavy]))), 2) if heavy.any() else None,
                }
            chosen = min(scored, key=lambda n: scored[n]["mae"])
            result.update(scored[chosen])
            result.update(
                validation_days=int(len(test)),
                heavy_rain_days=int(heavy.sum()),
                baseline_mae=_score(actual, test["lag_1"])["mae"],
                mae_without_rain=scored["without rain"]["mae"],
                mae_with_rain=scored["with rain"]["mae"],
                heavy_rain_mae_without_rain=scored["without rain"]["heavy_rain_mae"],
                heavy_rain_mae_with_rain=scored["with rain"]["heavy_rain_mae"],
            )
        result["uses_rain"] = chosen == "with rain"

        # Final model uses every row, including the most recent ones
        cols = candidates[chosen]
        models[commodity] = XGBRegressor(**MODEL_PARAMS).fit(data[cols], data["target"])
        crop_features[commodity] = cols
        shrinks[commodity] = result.get("shrink", 1.0)
        metrics[commodity] = result
        if verbose:
            print(commodity, result, flush=True)

    package = {
        "version": 2,
        "models": models,
        "le_state": le_state,
        "le_district": le_district,
        "le_commodity": le_commodity,
        "features": crop_features,  # per commodity
        "target": "log_change_from_lag_1",
        "shrink": shrinks,
    }
    tmp_path = model_path + ".tmp"
    joblib.dump(package, tmp_path)
    os.replace(tmp_path, model_path)

    summary = {
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "data_start": str(raw["date"].min().date()),
        "data_end": str(raw["date"].max().date()),
        "price_rows": int(len(raw)),
        "weather": weather is not None,
        "validation_from": str(cutoff.date()),
        "commodities": metrics,
    }
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    return summary


if __name__ == "__main__":
    train()
