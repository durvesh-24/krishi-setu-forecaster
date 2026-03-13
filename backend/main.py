from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
import base64
from crop_recommend import predict_crop
from weather import weather_forecast
from leaf_disease_detect import predict_disease
from leaf_detect import analyze_leaf_species

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

# Leaf Disease Detection endpoint
@app.post("/predict-disease")
async def predict_leaf_disease(file: UploadFile = File(...)):
    """
    Predict leaf disease from uploaded image.
    Accepts image files (PNG, JPG, etc.)
    """
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Validate file type
        if not file.content_type.startswith("image/"):
            return {"error": "Please upload a valid image file"}
        
        # Make prediction
        result = predict_disease(contents)
        
        return {
            "disease": result["disease"],
            "class": result["class"],
            "confidence": result["confidence"],
            "description": result["description"],
            "treatment": result["treatment"],
            "probability": result["confidence"]  # For compatibility with frontend
        }
    except Exception as e:
        return {"error": str(e), "detail": "Failed to process image"}

# Leaf Species Detection endpoint
@app.post("/predict-leaf")
async def predict_leaf_species(file: UploadFile = File(...)):
    """
    Predict leaf species from uploaded image.
    Accepts image files (PNG, JPG, etc.) and converts to base64 before calling Gemini.
    """
    try:
        # Read the uploaded file
        contents = await file.read()

        # Validate file type
        if not file.content_type.startswith("image/"):
            return {"error": "Please upload a valid image file"}

        # Convert image bytes to base64
        base64_image = base64.b64encode(contents).decode("utf-8")

        result = await analyze_leaf_species(base64_image)
        return {"species": result.species, "confidence": result.confidence}
    except Exception as e:
        return {"error": str(e), "detail": "Failed to process image"}

