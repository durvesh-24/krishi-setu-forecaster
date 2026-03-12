import torch
import torchvision
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import io
from typing import Dict
import os

# class labels from training
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

# optional disease descriptions (can be trimmed if not needed)
DISEASE_INFO = {
    cls: {"name": cls, "description": "", "treatment": ""}
    for cls in CLASS_NAMES
}

# load model once on import
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "LDD_resnet50.pth")

model = torchvision.models.resnet50(pretrained=False)
num_features = model.fc.in_features
model.fc = nn.Linear(num_features, len(CLASS_NAMES))
if os.path.exists(MODEL_PATH):
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model = model.to(DEVICE)
model.eval()

# transformation matching Colab code
TEST_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])


def predict_disease(image_data: bytes) -> Dict:
    """Simple prediction using PyTorch ResNet50, similar to Colab snippet."""
    img = Image.open(io.BytesIO(image_data)).convert("RGB")
    tensor = TEST_TRANSFORM(img).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.nn.functional.softmax(outputs, dim=1)
        _, idx = torch.max(outputs, 1)
        idx = idx.item()
        confidence = probs[0][idx].item()
    pred_cls = CLASS_NAMES[idx]
    return {
        "disease": pred_cls,
        "confidence": confidence,
    }
