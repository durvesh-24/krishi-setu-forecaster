import io
import json
import os
import threading
import time
from collections import defaultdict, deque
from datetime import date
from typing import Optional

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
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

# ---------------------------------------------------------------- security

# Only the KrishiSetu website (Vercel, incl. preview links) and local development
# may call the API from a browser. Extra origins: ALLOWED_ORIGINS=https://a.com,https://b.com
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()],
    allow_origin_regex=r"https://krishi-setu-forecaster(-[a-z0-9-]+)?\.vercel\.app|http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "ngrok-skip-browser-warning"],
)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 40_000_000  # refuse "decompression bomb" images

# Requests per minute per visitor (heavy endpoints get a lower limit)
RATE_LIMITS = {"/predict-leaf": 10, "/predict-disease": 20, "/weather": 60}
DEFAULT_RATE_LIMIT = 120
# Gemini costs money / quota: cap plant-name lookups per day for everyone together
GEMINI_DAILY_LIMIT = int(os.getenv("GEMINI_DAILY_LIMIT", "300"))

_hits = defaultdict(deque)
_hits_lock = threading.Lock()
_gemini_usage = {"day": None, "count": 0}


def error(message: str, detail: str, status: int = 400):
    return JSONResponse(status_code=status, content={"error": message, "detail": detail})


def server_error(detail: str, exc: Exception):
    """Log the real problem on the laptop, show visitors a plain message."""
    print(f"[error] {detail}: {exc!r}", flush=True)
    return error("Something went wrong on the server. Please try again.", detail, 500)


def _client_ip(request: Request) -> str:
    # ngrok passes the visitor's address in X-Forwarded-For
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


@app.middleware("http")
async def protect(request: Request, call_next):
    if request.method == "POST":
        size = request.headers.get("content-length")
        if size and size.isdigit() and int(size) > MAX_UPLOAD_BYTES + 1024 * 1024:
            return error("File too large (max 10 MB)", "Request too large", 413)

    if request.method != "OPTIONS":
        limit = RATE_LIMITS.get(request.url.path, DEFAULT_RATE_LIMIT)
        key = (_client_ip(request), request.url.path)
        now = time.monotonic()
        with _hits_lock:
            window = _hits[key]
            while window and now - window[0] > 60:
                window.popleft()
            if len(window) >= limit:
                return error("Too many requests, please wait a minute", "Rate limited", 429)
            window.append(now)
            if len(_hits) > 20000:  # forget idle visitors
                for k in [k for k, v in _hits.items() if not v or now - v[-1] > 60]:
                    del _hits[k]

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


async def read_image(file: UploadFile):
    """The upload's bytes if it is a real image under the size limit, else an error response."""
    if not (file.content_type or "").startswith("image/"):
        return None, error("Please upload a valid image file", "Invalid file type")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        return None, error("File too large (max 10 MB)", "Image too large", 413)
    try:
        Image.open(io.BytesIO(data)).verify()
    except Exception:
        return None, error("Please upload a valid image file", "Not a readable image")
    return data, None


# Define input schema
class CropInput(BaseModel):
    N: float = Field(ge=0, le=1000)
    P: float = Field(ge=0, le=1000)
    K: float = Field(ge=0, le=1000)
    temperature: float = Field(ge=-50, le=70)
    humidity: float = Field(ge=0, le=100)
    ph: float = Field(ge=0, le=14)
    rainfall: float = Field(ge=0, le=5000)


class PriceInput(BaseModel):
    state: str = Field(max_length=100)
    district: str = Field(max_length=100)
    commodity: str = Field(max_length=50)
    date: str = Field(default_factory=lambda: date.today().isoformat(), pattern=r"^\d{4}-\d{2}-\d{2}$")
    horizon: int = Field(default=7, ge=1, le=30)


class WeatherInput(BaseModel):
    city: Optional[str] = Field(default=None, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)


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
        print(f"[error] weather: {e!r}", flush=True)
        return error("Weather service is not reachable right now.", "Failed to fetch weather", 502)


# Leaf Disease Detection endpoint
@app.post("/predict-disease")
async def predict_leaf_disease(file: UploadFile = File(...)):
    """
    Predict leaf disease from uploaded image.
    Accepts image files (PNG, JPG, etc.)
    """
    data, problem = await read_image(file)
    if problem:
        return problem
    try:
        result = predict_disease(data)
        return {**result, "probability": result["confidence"]}  # probability kept for older clients
    except Exception as e:
        return server_error("Failed to process image", e)


# Leaf Species Detection endpoint
@app.post("/predict-leaf")
async def predict_leaf_species(file: UploadFile = File(...)):
    """
    Identify the plant from a leaf image using Gemini.
    """
    data, problem = await read_image(file)
    if problem:
        return problem
    today = date.today().isoformat()
    with _hits_lock:
        if _gemini_usage["day"] != today:
            _gemini_usage.update(day=today, count=0)
        if _gemini_usage["count"] >= GEMINI_DAILY_LIMIT:
            return error("Plant identification is busy today, please try tomorrow", "Daily limit reached", 429)
        _gemini_usage["count"] += 1
    try:
        result = await analyze_leaf_species(data, file.content_type)
        return {"species": result.species, "confidence": result.confidence}
    except Exception as e:
        return server_error("Failed to identify leaf", e)


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
        "update": {**{k: v for k, v in update_status.items() if k != "last_error"},
                   "failed": bool(update_status["last_error"])},
    }


@app.post("/predict-price")
def predict_price(data: PriceInput):
    """
    Predict commodity price based on state, district, commodity, and date.
    """
    try:
        result = predict_commodity_price(data.state, data.district, data.commodity, data.date, data.horizon)
    except Exception as e:
        return server_error("Failed to predict price", e)
    if "error" in result:
        return error(result["error"], "Failed to predict price")
    return result
