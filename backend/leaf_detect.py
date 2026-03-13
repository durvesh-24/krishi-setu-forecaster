import os
import base64
import json
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

# Create Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Response model
class SpeciesResponse(BaseModel):
    species: str
    confidence: float


async def analyze_leaf_species(base64Image: str) -> SpeciesResponse:
    try:
        prompt = """
        Identify only the plant species from this leaf image.
        Do not provide disease information.
        Return result strictly in JSON format:

        {
          "species": "Plant name",
          "confidence": 0.95
        }
        """

        # Remove base64 header if present
        image_data = base64Image.split(",")[1] if "," in base64Image else base64Image
        image_bytes = base64.b64decode(image_data)

        response = client.models.generate_content(
            model="gemini-1.5-pro",
            contents=[
                prompt,
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg",
                ),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            ),
        )

        result = json.loads(response.text)

        return SpeciesResponse(
            species=result.get("species", "Unknown"),
            confidence=result.get("confidence", 0.0),
        )

    except Exception as e:
        raise Exception(str(e))