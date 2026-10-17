from datetime import date
from typing import Optional

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from crop_recommend import predict_crop, top_crops
from leaf_detect import analyze_leaf_species
from leaf_disease_detect import predict_disease
from price_forecasting import get_price_options, predict_commodity_price
from weather import weather_forecast

# Initialize FastAPI app
app = FastAPI(
    title="KrishiSetu API 🌾",
    description="Crop recommendation, leaf disease detection, weather and mandi price forecasting.",
    version="1.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def error(message: str, detail: str, status: int = 400):
    return JSONResponse(status_code=status, content={"error": message, "detail": detail})


# Define input schema
class CropInput(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float = Field(ge=0, le=100)
    ph: float = Field(ge=0, le=14)
    rainfall: float = Field(ge=0)


class PriceInput(BaseModel):
    state: str
    district: str
    commodity: str
    date: str = Field(default_factory=lambda: date.today().isoformat())
    horizon: int = Field(default=7, ge=1, le=30)


class WeatherInput(BaseModel):
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# Root endpoint
@app.get("/")
def home():
    return {"message": "Welcome to the KrishiSetu API 🌾"}


# Crop recommendation endpoint
@app.post("/predict")
def get_crop_prediction(data: CropInput):
    values = (data.N, data.P, data.K, data.temperature, data.humidity, data.ph, data.rainfall)
    return {"predicted_crop": predict_crop(*values), "top_crops": top_crops(*values)}


# Weather endpoint
@app.post("/weather")
def get_weather(data: WeatherInput):
    try:
        return {"weather_forecast": weather_forecast(data.city, data.latitude, data.longitude)}
    except ValueError as e:
        return error(str(e), "Location not found", 404)
    except Exception as e:
        return error(str(e), "Failed to fetch weather", 502)


# Leaf Disease Detection endpoint
@app.post("/predict-disease")
async def predict_leaf_disease(file: UploadFile = File(...)):
    """
    Predict leaf disease from uploaded image.
    Accepts image files (PNG, JPG, etc.)
    """
    if not (file.content_type or "").startswith("image/"):
        return error("Please upload a valid image file", "Invalid file type")
    try:
        result = predict_disease(await file.read())
        return {**result, "probability": result["confidence"]}  # probability kept for older clients
    except Exception as e:
        return error(str(e), "Failed to process image", 500)


# Leaf Species Detection endpoint
@app.post("/predict-leaf")
async def predict_leaf_species(file: UploadFile = File(...)):
    """
    Identify the plant from a leaf image using Gemini.
    """
    if not (file.content_type or "").startswith("image/"):
        return error("Please upload a valid image file", "Invalid file type")
    try:
        result = await analyze_leaf_species(await file.read(), file.content_type)
        return {"species": result.species, "confidence": result.confidence}
    except Exception as e:
        return error(str(e), "Failed to identify leaf", 500)


# Price forecasting
@app.get("/price-options")
def price_options():
    """
    States, districts and commodities that have enough data to forecast.
    """
    return get_price_options()


@app.post("/predict-price")
def predict_price(data: PriceInput):
    """
    Predict commodity price based on state, district, commodity, and date.
    """
    try:
        result = predict_commodity_price(data.state, data.district, data.commodity, data.date, data.horizon)
    except Exception as e:
        return error(str(e), "Failed to predict price", 500)
    if "error" in result:
        return error(result["error"], "Failed to predict price")
    return result
