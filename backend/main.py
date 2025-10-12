from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
from crop_recommend import predict_crop
from weather import weather_forecast

# Initialize FastAPI app
app = FastAPI(
    title="Crop Prediction API 🌾",
    description="Predict suitable crops based on soil and weather conditions.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define input schema
class CropInput(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float
    
class CityInput(BaseModel):
    city: str

# Root endpoint
@app.get("/")
def home():
    return {"message": "Welcome to the Crop Prediction API 🌾"}

# Prediction endpoint
@app.post("/predict")
def get_prediction(data: CropInput):
    crop = predict_crop(
        data.N,
        data.P,
        data.K,
        data.temperature,
        data.humidity,
        data.ph,
        data.rainfall
    )
    return {"predicted_crop": crop}

# Weather endpoint
@app.post("/weather")
def get_prediction(data: CityInput):
    weather = weather_forecast(
        data.city
    )
    return {"weather_forecast": weather}


