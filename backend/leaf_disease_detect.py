import io
import os
from typing import Dict

from PIL import Image

# class labels from training (order must match the trained model)
CLASS_NAMES = [
    'Cicer arietinum_healthy',
    'Cicer arietinum_Alternaria_Leaf_Spot',
    'Cicer arietinum_Dry_leaves',
    'Hibiscus_healthy',
    'Hibiscus_powdery_mildew',
    'Hibiscus_Insect_damage ',
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

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "LDD_resnet50.pth")

# The model is loaded on first use so the rest of the API starts even if
# PyTorch is not installed or the weights file is missing.
_model = None
_device = None
_transform = None


def _load_model():
    global _model, _device, _transform
    if _model is not None:
        return

    import torch
    import torch.nn as nn
    import torchvision
    from torchvision import transforms

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model weights not found at {MODEL_PATH}")

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = torchvision.models.resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(CLASS_NAMES))
    model.load_state_dict(torch.load(MODEL_PATH, map_location=_device))
    _model = model.to(_device).eval()

    # transformation matching Colab code
    _transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


def predict_disease(image_data: bytes) -> Dict:
    """Prediction using PyTorch ResNet50, same as the Colab training notebook."""
    import torch

    _load_model()
    img = Image.open(io.BytesIO(image_data)).convert("RGB")
    tensor = _transform(img).unsqueeze(0).to(_device)
    with torch.no_grad():
        probs = torch.nn.functional.softmax(_model(tensor), dim=1)[0]
    top = torch.topk(probs, k=3)

    pred_cls = CLASS_NAMES[top.indices[0].item()].strip()
    return {
        "disease": pred_cls,
        "class": pred_cls,
        "confidence": round(top.values[0].item(), 4),
        "alternatives": [
            {"class": CLASS_NAMES[i.item()].strip(), "confidence": round(v.item(), 4)}
            for v, i in zip(top.values[1:], top.indices[1:])
        ],
        "description": "",
        "treatment": "",
    }
