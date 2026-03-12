import traceback

try:
    import numpy as np
except ImportError:
    np = None
    print("Warning: numpy could not be imported. Predictions will fail.")

from PIL import Image
import io
from typing import Dict
import torch
import torchvision
import torch.nn as nn
from torchvision import transforms
import os

# Define class names (from Colab training)
CLASS_NAMES = [
    'Cicer arietinum_healthy',
    'Cicer arietinum_Alternaria_Leaf_Spot',
    'Cicer arietinum_Dry_leaves',
    'Hibiscus_healthy',
    'Hibiscus_powdery_mildew',
    'Hibiscus_Insect_damage',
    'Hibiscus_Dried_leaf',
    'Hibiscus_yellow_chlorosis',
    'mango_healthy',
    'mango_Powderly_Mildew',
    'mango_Mango_rust',
    'mango_Bacterial_Leaf_Spot',
    'mango_Dried_leaves',
    'mango_Nutrient_Deficiency',
    'Jowar_healthy',
    'Jowar_Anthracnose(Leaf Blight)',
    'Jowar_Jowar_rust',
    'Jowar_black_mold',
    'Jowar_Dry_leaves'
]

# Disease information database
DISEASE_INFO = {
    'Cicer arietinum_healthy': {
        "name": "Healthy",
        "description": "Your chickpea (Cicer arietinum) leaf appears to be healthy with no visible signs of disease.",
        "treatment": "Continue with regular maintenance and monitoring."
    },
    'Cicer arietinum_Alternaria_Leaf_Spot': {
        "name": "Alternaria Leaf Spot",
        "description": "Alternaria leaf spot causes small brown spots with concentric rings on chickpea leaves.",
        "treatment": "Remove affected leaves, apply fungicides like mancozeb, and ensure good air circulation."
    },
    'Cicer arietinum_Dry_leaves': {
        "name": "Dry Leaves",
        "description": "Leaves are drying out, which could be due to stress conditions, dehydration, or disease.",
        "treatment": "Ensure proper irrigation, check soil moisture, and apply suitable fungicides if needed."
    },
    'Hibiscus_healthy': {
        "name": "Healthy",
        "description": "Your hibiscus leaf appears to be healthy with no visible signs of disease.",
        "treatment": "Continue with regular maintenance and monitoring."
    },
    'Hibiscus_powdery_mildew': {
        "name": "Powdery Mildew",
        "description": "Powdery mildew causes a white powdery coating on hibiscus leaves.",
        "treatment": "Apply sulfur-based fungicides, improve air circulation, and reduce humidity."
    },
    'Hibiscus_Insect_damage': {
        "name": "Insect Damage",
        "description": "The leaf shows signs of damage from insects like aphids, spider mites, or scale insects.",
        "treatment": "Use appropriate insecticides or natural remedies, and prune affected parts."
    },
    'Hibiscus_Dried_leaf': {
        "name": "Dried Leaf",
        "description": "The leaf is dried out, possibly due to environmental stress or nutrient deficiency.",
        "treatment": "Ensure proper watering, provide adequate nutrients, and check soil conditions."
    },
    'Hibiscus_yellow_chlorosis': {
        "name": "Yellow Chlorosis",
        "description": "Yellow chlorosis indicates nutrient deficiency, typically iron or magnesium deficiency.",
        "treatment": "Apply iron chelate or magnesium sulfate, and ensure proper soil pH."
    },
    'mango_healthy': {
        "name": "Healthy",
        "description": "Your mango leaf appears to be healthy with no visible signs of disease.",
        "treatment": "Continue with regular maintenance and monitoring."
    },
    'mango_Powderly_Mildew': {
        "name": "Powdery Mildew",
        "description": "Powdery mildew causes white powdery spots on mango leaves and flowers.",
        "treatment": "Apply sulfur or potassium bicarbonate fungicides and improve air circulation."
    },
    'mango_Mango_rust': {
        "name": "Mango Rust",
        "description": "Mango rust causes rusty-brown pustules on the undersides of leaves.",
        "treatment": "Use copper or sulfur-based fungicides, and remove severely affected leaves."
    },
    'mango_Bacterial_Leaf_Spot': {
        "name": "Bacterial Leaf Spot",
        "description": "Bacterial leaf spot causes dark, water-soaked spots with yellow halos on mango leaves.",
        "treatment": "Use copper-based bactericides, prune infected branches, and improve drainage."
    },
    'mango_Dried_leaves': {
        "name": "Dried Leaves",
        "description": "Leaves are drying out, which could be due to drought stress or fungal infection.",
        "treatment": "Ensure proper irrigation and apply fungicides if necessary."
    },
    'mango_Nutrient_Deficiency': {
        "name": "Nutrient Deficiency",
        "description": "The leaf shows signs of nutrient deficiency, affecting plant growth and productivity.",
        "treatment": "Apply balanced fertilizer or micronutrients based on soil test recommendations."
    },
    'Jowar_healthy': {
        "name": "Healthy",
        "description": "Your sorghum (Jowar) leaf appears to be healthy with no visible signs of disease.",
        "treatment": "Continue with regular maintenance and monitoring."
    },
    'Jowar_Anthracnose(Leaf Blight)': {
        "name": "Anthracnose (Leaf Blight)",
        "description": "Anthracnose causes brown lesions with dark borders on sorghum leaves.",
        "treatment": "Use resistant varieties, apply fungicides, and ensure good field sanitation."
    },
    'Jowar_Jowar_rust': {
        "name": "Jowar Rust",
        "description": "Jowar rust causes reddish-brown pustules on leaves and stems.",
        "treatment": "Use resistant varieties and apply sulfur-based fungicides if needed."
    },
    'Jowar_black_mold': {
        "name": "Black Mold",
        "description": "Black mold causes dark fungal growth on sorghum leaves, usually in wet conditions.",
        "treatment": "Improve air circulation, reduce humidity, and apply fungicides if severe."
    },
    'Jowar_Dry_leaves': {
        "name": "Dry Leaves",
        "description": "Leaves are drying out, possibly due to drought stress or disease.",
        "treatment": "Ensure adequate irrigation and apply fungicides if disease is suspected."
    },
}


class LeafDiseaseDetector:
    def __init__(self, model_path: str = None):
        """
        Initialize the leaf disease detector with a PyTorch ResNet50 model.
        """
        self.model = None
        self.model_path = model_path
        self.IMG_SIZE = 224
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Define image transformation
        self.test_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406],
                                [0.229, 0.224, 0.225])
        ])

        # Try to load model if path provided
        if model_path:
            print(f"Attempting to load model from provided path: {model_path}")
        if model_path and os.path.exists(model_path):
            try:
                self.model = self._load_pytorch_model(model_path)
                print(f"Model loaded from {model_path}")
            except Exception as e:
                print(f"Error loading model from {model_path}: {e}")
                self.model = None
        else:
            # Try to load from default location
            default_path = os.path.join(os.path.dirname(__file__), "LDD_resnet50.pth")
            print(f"Looking for default model at: {default_path}")
            if os.path.exists(default_path):
                try:
                    self.model = self._load_pytorch_model(default_path)
                    print(f"Model loaded from default path: {default_path}")
                except Exception as e:
                    print(f"Error loading default model: {e}")
                    self.model = None
            else:
                print("Default model file not found.")

    def _load_pytorch_model(self, path: str = None):
        """Load a PyTorch ResNet50 model from the given path or self.model_path"""
        # determine which path to use
        model_file = path or self.model_path
        if model_file is None or not os.path.exists(model_file):
            raise FileNotFoundError(f"Model file not found: {model_file}")

        # Initialize ResNet50
        model = torchvision.models.resnet50(pretrained=False)
        num_features = model.fc.in_features
        model.fc = nn.Linear(num_features, len(CLASS_NAMES))
        
        # Load the saved weights
        model.load_state_dict(torch.load(model_file, map_location=self.device))
        model = model.to(self.device)
        model.eval()  # Set to evaluation mode
        
        return model

    def preprocess_image(self, image_data: bytes) -> torch.Tensor:
        """
        Preprocess image for model prediction.
        Converts bytes to PIL Image, resizes, and normalizes.
        """
        # Open image from bytes
        img = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Apply transformations
        img_tensor = self.test_transform(img)
        
        # Add batch dimension
        img_tensor = img_tensor.unsqueeze(0).to(self.device)
        
        return img_tensor

    def predict(self, image_data: bytes) -> Dict:
        """
        Predict disease from image bytes.
        Returns disease name, confidence, description, and treatment.
        """
        if self.model is None:
            raise ValueError("Model not initialized. Please ensure LDD_resnet50.pth exists in the backend folder.")

        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_data)

            # Make prediction
            with torch.no_grad():
                outputs = self.model(processed_image)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                confidence, predicted_idx = torch.max(outputs, 1)
                
                predicted_idx = predicted_idx.item()
                confidence = probabilities[0][predicted_idx].item()

            # Get predicted class
            predicted_class = CLASS_NAMES[predicted_idx]

            # Get disease info
            disease_info = DISEASE_INFO.get(predicted_class, {})

            return {
                "disease": disease_info.get("name", predicted_class),
                "class": predicted_class,
                "confidence": float(confidence),
                "description": disease_info.get("description", ""),
                "treatment": disease_info.get("treatment", ""),
            }
        except Exception as e:
            # log full traceback for debugging
            print("Exception during prediction:", repr(e))
            traceback.print_exc()
            # if numpy import failed earlier, warn explicitly
            if np is None:
                raise ValueError("Error during prediction: numpy module is not available. Please install numpy.")
            raise ValueError(f"Error during prediction: {str(e)}")

    def predict_from_file(self, file_path: str) -> Dict:
        """
        Predict disease from file path.
        """
        with open(file_path, 'rb') as f:
            image_data = f.read()
        return self.predict(image_data)


# Initialize global detector instance
detector = None


def get_detector():
    """Get or create the global leaf disease detector instance"""
    global detector
    if detector is None:
        model_path = os.path.join(os.path.dirname(__file__), "LDD_resnet50.pth")
        print(f"Initializing detector, model path {model_path}")
        detector = LeafDiseaseDetector(model_path=model_path)
        if detector.model is None:
            print("Warning: detector initialized but model not loaded")
    return detector


def predict_disease(image_data: bytes) -> Dict:
    """
    Main function to predict leaf disease from image bytes.
    """
    detector_instance = get_detector()
    return detector_instance.predict(image_data)
