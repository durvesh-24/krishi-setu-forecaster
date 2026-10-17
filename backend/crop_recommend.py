import os

import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load model and scaler
model = joblib.load(os.path.join(BASE_DIR, "random_forest_model.joblib"))
scaler = joblib.load(os.path.join(BASE_DIR, "scaler.joblib"))


def _scaled(N, P, K, temperature, humidity, ph, rainfall):
    new_data = pd.DataFrame({
        "N": [N],
        "P": [P],
        "K": [K],
        "temperature": [temperature],
        "humidity": [humidity],
        "ph": [ph],
        "rainfall": [rainfall],
    })
    return pd.DataFrame(scaler.transform(new_data), columns=new_data.columns)


def predict_crop(N, P, K, temperature, humidity, ph, rainfall):
    """
    Predict crop based on soil and weather parameters.
    """
    prediction = model.predict(_scaled(N, P, K, temperature, humidity, ph, rainfall))
    return str(prediction[0])


def top_crops(N, P, K, temperature, humidity, ph, rainfall, k=3):
    """
    Top-k crops with the model's confidence for each (0-1).
    """
    probs = model.predict_proba(_scaled(N, P, K, temperature, humidity, ph, rainfall))[0]
    ranked = sorted(zip(model.classes_, probs), key=lambda x: x[1], reverse=True)[:k]
    return [{"crop": str(c), "confidence": round(float(p), 4)} for c, p in ranked if p > 0]
