import joblib
import pandas as pd

# Load model and scaler
model = joblib.load("random_forest_model.joblib")
scaler = joblib.load("scaler.joblib")

def predict_crop(N, P, K, temperature, humidity, ph, rainfall):
    """
    Predict crop based on soil and weather parameters.
    """
    # Create a DataFrame from the inputs
    new_data = pd.DataFrame({
        'N': [N],
        'P': [P],
        'K': [K],
        'temperature': [temperature],
        'humidity': [humidity],
        'ph': [ph],
        'rainfall': [rainfall]
    })

    # Scale the new data
    new_data_scaled = pd.DataFrame(scaler.transform(new_data), columns=new_data.columns)

    # Predict crop
    prediction = model.predict(new_data_scaled)

    return prediction[0]
