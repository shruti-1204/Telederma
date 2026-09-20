from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from app.quality import check_image_quality

app = FastAPI(title="Telederma AI Service", version="0.1.0")

DISCLAIMER = "AI-assisted observation only. Not a medical diagnosis."


@app.get("/health")
def health():
    return {"status": "ok", "model_version": "stub-0.1"}


@app.post("/api/ai/image-quality")
async def image_quality(file: UploadFile = File(...)):
    contents = await file.read()
    result = check_image_quality(contents)
    return result

class AssessmentIn(BaseModel):
    image_id: str
    symptoms: dict
    duration_days: int
    body_location: Optional[str] = None
    history: dict = {}


@app.post("/api/ai/assessment")
async def assessment(payload: AssessmentIn):
    return {
        "observations": [
            {"label": "eczema-like features", "confidence": 0.62},
            {"label": "contact dermatitis-like features", "confidence": 0.21},
        ],
        "triage": "YELLOW",
        "summary": "Visual features and reported symptoms warrant dermatologist review.",
        "model_version": "stub-0.1",
        "disclaimer": DISCLAIMER,
    }