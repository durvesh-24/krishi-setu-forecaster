import json
import os
import threading
import time
from datetime import date
from typing import Optional

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from crop_recommend import predict_crop, top_crops
from leaf_detect import analyze_leaf_species
from leaf_disease_detect import predict_disease
import price_forecasting
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


# Daily price data refresh from Agmarknet (needs DATA_GOV_API_KEY in .env)
UPDATE_INTERVAL_HOURS = float(os.getenv("PRICE_UPDATE_INTERVAL_HOURS", "24"))
update_status = {"running": False, "last_run": None, "last_result": None, "last_error": None}
_update_lock = threading.Lock()


def run_price_update():
    if not _update_lock.acquire(blocking=False):
        return
    update_status.update(running=True, last_error=None)
    try:
        from update_prices import update

        result = update(log=lambda msg: print(f"[price-update] {msg}", flush=True))
        if "training" in result:
            price_forecasting.load()
        update_status["last_result"] = result.get("sync")
    except Exception as e:
        update_status["last_error"] = str(e)
        print(f"[price-update] failed: {e}", flush=True)
    finally:
        update_status.update(running=False, last_run=time.strftime("%Y-%m-%d %H:%M:%S"))
        _update_lock.release()


def _price_update_loop():
    time.sleep(30)  # let the server finish starting
    while True:
        run_price_update()
        # after a failure (e.g. data.gov.in down) try again in an hour
        time.sleep(3600 if update_status["last_error"] else UPDATE_INTERVAL_HOURS * 3600)


@app.on_event("startup")
def start_price_updates():
    if os.getenv("DATA_GOV_API_KEY") and os.getenv("AUTO_UPDATE_PRICES", "1") != "0":
        threading.Thread(target=_price_update_loop, daemon=True, name="price-update").start()
    else:
        print("[price-update] DATA_GOV_API_KEY not set - automatic Agmarknet updates are off", flush=True)


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


@app.get("/price-status")
def price_status():
    """
    How fresh the price data and models are, plus the last automatic update.
    """
    metrics = {}
    path = os.path.join(price_forecasting.BASE_DIR, "price_model_metrics.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            metrics = json.load(f)
    return {
        "data_end": price_forecasting.df["date"].max().date().isoformat(),
        "rows": int(len(price_forecasting.df)),
        "model": metrics,
        "auto_update": bool(os.getenv("DATA_GOV_API_KEY")),
        "update": update_status,
    }


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
