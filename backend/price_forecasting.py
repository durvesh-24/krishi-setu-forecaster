import joblib
import pandas as pd

# Load model package and data
model_package = joblib.load("commodity_price_model.joblib")
df = pd.read_csv("cleaned_combine_wsrjc.csv")
df['date'] = pd.to_datetime(df[['year','month','day']])

# Extract components from model package
commodity_models = model_package["models"]
le_state = model_package["le_state"]
le_district = model_package["le_district"]
features = model_package["features"]

def predict_commodity_price(state, district, commodity, date_input):
    """
    Predict commodity price based on state, district, commodity, and date.
    """
    # Convert date to datetime
    date_input = pd.to_datetime(date_input)

    # Check if model exists for this commodity
    if commodity not in commodity_models:
        return {"error": "Model not available for this commodity"}

    model = commodity_models[commodity]

    # Get historical data for this series
    history = df[
        (df['State Name'] == state) &
        (df['District Name'] == district) &
        (df['Commodity'] == commodity) &
        (df['date'] < date_input)
    ].sort_values('date')

    if len(history) < 7:
        return {"error": "Not enough historical data"}

    # Create lag features
    lag_1 = history['Modal Price (Rs./Quintal)'].iloc[-1]
    lag_7 = history['Modal Price (Rs./Quintal)'].iloc[-7]
    rolling_7 = history['Modal Price (Rs./Quintal)'].iloc[-7:].mean()

    # Time features
    day_of_week = date_input.dayofweek
    month = date_input.month
    quarter = (date_input.month - 1) // 3 + 1

    # Encode state and district
    state_enc = le_state.transform([state])[0]
    district_enc = le_district.transform([district])[0]

    # Create feature row
    input_data = pd.DataFrame([{
        'State_enc': state_enc,
        'District_enc': district_enc,
        'lag_1': lag_1,
        'lag_7': lag_7,
        'rolling_7': rolling_7,
        'day_of_week': day_of_week,
        'month': month,
        'quarter': quarter
    }])

    # Predict
    predicted_price = model.predict(input_data)[0]

    return {"predicted_price": round(float(predicted_price), 2)}
