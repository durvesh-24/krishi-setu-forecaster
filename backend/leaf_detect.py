import json
import os

from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables (backend/.env or the project root .env)
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

_client = None


def _get_client():
    """Create the Gemini client on first use so a missing key doesn't stop the API."""
    global _client
    if _client is None:
        from google import genai

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        _client = genai.Client(api_key=api_key)
    return _client


# Response model
class SpeciesResponse(BaseModel):
    species: str
    confidence: float


PROMPT = """
Identify only the layman plant name from this leaf image.
Do not provide disease information.
Return result strictly in JSON format:

{
  "species": "Plant name",
  "confidence": 0.95
}
"""


async def analyze_leaf_species(image_bytes: bytes, mime_type: str = "image/jpeg") -> SpeciesResponse:
    from google.genai import types

    response = await _get_client().aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            PROMPT,
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )

    result = json.loads(response.text)
    return SpeciesResponse(
        species=result.get("species", "Unknown"),
        confidence=result.get("confidence", 0.0),
    )
