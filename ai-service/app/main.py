from fastapi import FastAPI, UploadFile, File, Form
from typing import Optional
import json

from app.quality import check_image_quality
from app.triage import triage_decision
from app.model import load_model
from app.inference import run_inference

from app.chatbot import get_chat_response
from pydantic import BaseModel

app = FastAPI(title="Telederma AI Service", version="0.2.0")

DISCLAIMER = (
    "AI-assisted observation only, based on a research prototype model "
    "(measured test macro-F1 ~0.16). Not a medical diagnosis. "
    "All results require dermatologist review."
)

@app.on_event("startup")
def startup_event():
    load_model()

@app.get("/health")
def health():
    return {"status": "ok", "model_version": "fusion-v1"}

@app.post("/api/ai/image-quality")
async def image_quality(file: UploadFile = File(...)):
    contents = await file.read()
    result = check_image_quality(contents)
    return result


@app.post("/api/ai/assessment")
async def assessment(
    file: UploadFile = File(...),
    symptoms: str = Form(...),
    duration_days: int = Form(...),
    body_location: Optional[str] = Form(None),
):
    image_bytes = await file.read()

    quality_result = check_image_quality(image_bytes)

    if quality_result["quality"] != "GOOD":
        return {
            "status": "IMAGE_REJECTED",
            "image_quality": quality_result,
            "message": "Please upload a clearer skin image.",
            "model_version": "fusion-v1",
            "disclaimer": DISCLAIMER,
        }

    try:
        symptoms_dict = json.loads(symptoms)
    except json.JSONDecodeError:
        return {
            "status": "INVALID_INPUT",
            "message": "Invalid symptoms JSON.",
            "disclaimer": DISCLAIMER,
        }

    predicted_class, confidence, observations = run_inference(
        image_bytes,
        symptoms_dict,
        duration_days
    )

    triage_level, triage_reason = triage_decision(
        predicted_class,
        confidence,
        symptoms_dict
    )

    return {
        "status": "SUCCESS",
        "image_quality": quality_result,
        "observations": observations,
        "triage": triage_level,
        "triage_reason": triage_reason,
        "summary": (
            f"Top observation: "
            f"{predicted_class}-like features "
            f"({confidence:.0%} model confidence)."
        ),
        "body_location": body_location,
        "model_version": "fusion-v1",
        "disclaimer": DISCLAIMER,
    }


class ChatIn(BaseModel):
    message: str
    history: list = []

@app.post("/api/ai/chat")
async def chat(payload: ChatIn):
    result = get_chat_response(payload.message, payload.history)
    return result