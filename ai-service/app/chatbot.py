import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

SYSTEM_PROMPT = """
You are the AI Skin Assistant for TeleDerma, an advanced teledermatology platform.

Your primary roles are:
1. GENERAL SKIN & DERMATOLOGY EDUCATION
   - Answer general, evidence-based educational questions about dermatology, skincare ingredients (e.g. salicylic acid, adapalene, niacinamide, ceramides), and common skin conditions (acne, eczema, dermatitis, psoriasis, rosacea, dry skin, sun protection).
   - Be clear, empathetic, helpful, and concise (typically 2-4 sentences).

2. TELEDERMA APP GUIDANCE
   - Help patients understand how to use TeleDerma: uploading a skin photo, taking the symptoms questionnaire, receiving AI triage, and booking a certified dermatologist video consultation.
   - AI Triage levels:
     * YELLOW: Routine, no acute escalation rules triggered.
     * ORANGE: Dermatologist consultation recommended for professional assessment.
     * RED: High-risk or emergency symptoms detected; immediate in-person hospital evaluation required.

MEDICAL SAFETY BOUNDARIES:
- Never provide an official diagnosis for a user's personal condition or claim certainty.
- Never prescribe prescription drugs or advise taking prescription medications without a doctor.
- When users ask about personal lesions, advise them to use TeleDerma's "Start Doctor Consultation" feature to upload high-resolution photos and consult a board-certified dermatologist.
"""

def generate_suggestions(user_message: str, reply_text: str = "") -> list:
    msg = (user_message + " " + reply_text).lower()
    if any(k in msg for k in ["acne", "pimple", "comedone", "breakout"]):
        return ["Adapalene vs Benzoyl Peroxide", "How to prevent acne scars?", "Start Doctor Consultation ->"]
    elif any(k in msg for k in ["dry", "flak", "barrier", "ceramide"]):
        return ["How to repair skin barrier?", "Ceramides vs Hyaluronic Acid", "Start Doctor Consultation ->"]
    elif any(k in msg for k in ["eczema", "dermatitis", "atopic"]):
        return ["Common eczema triggers", "Safe moisturizers for eczema", "Start Doctor Consultation ->"]
    elif any(k in msg for k in ["psoriasis", "plaque", "scale"]):
        return ["Is psoriasis contagious?", "Topical psoriasis treatments", "Start Doctor Consultation ->"]
    elif any(k in msg for k in ["itch", "rash", "redness", "erythema"]):
        return ["When is a rash an emergency?", "Soothing home care tips", "Start Doctor Consultation ->"]
    elif any(k in msg for k in ["sun", "spf", "sunscreen", "uv"]):
        return ["Mineral vs Chemical sunscreen", "How often to reapply SPF?", "Start Doctor Consultation ->"]
    elif any(k in msg for k in ["triage", "yellow", "orange", "red", "risk"]):
        return ["Explain YELLOW vs ORANGE triage", "When should I go to hospital?", "Start Doctor Consultation ->"]
    elif any(k in msg for k in ["hello", "hi", "hey"]):
        return ["Why is my skin becoming dry?", "How to treat acne breakouts?", "Adapalene vs Benzoyl Peroxide"]
    else:
        return ["Why is my skin becoming dry?", "How to treat acne breakouts?", "Start Doctor Consultation ->"]


def _fallback_education_response(user_message: str) -> str:
    msg = user_message.lower().strip()
    if any(w in msg for w in ["hello", "hi", "hey", "greetings"]):
        return "Hello! I am your TeleDerma AI Skin Assistant. I can answer educational questions regarding skincare ingredients, common dermatological conditions, or guide you through consulting a certified dermatologist. How can I assist your skin health today?"
    elif "acne" in msg or "pimple" in msg or "breakout" in msg:
        return "Acne occurs when hair follicles become plugged with sebum and dead skin cells. Common evidence-based ingredients include Salicylic Acid (BHA) for unclogging pores, Benzoyl Peroxide to target acne-causing bacteria, and Adapalene (retinoid) for cell turnover. For persistent, cystic, or scarring breakouts, consulting a dermatologist for prescription therapy is recommended."
    elif "adapalene" in msg and "benzoyl" in msg:
        return "Adapalene is a topical retinoid that normalizes skin cell turnover and prevents clogged pores, whereas Benzoyl Peroxide is an antibacterial agent that reduces inflammation and kills C. acnes bacteria. Dermatologists often combine both for complementary efficacy, but they should be introduced gradually to prevent barrier dryness."
    elif "eczema" in msg or "dermatitis" in msg:
        return "Eczema (atopic dermatitis) causes inflamed, itchy, and irritated epidermal patches with an impaired moisture barrier. Gentle fragrance-free cleansers and ceramide-rich barrier creams help soothe flares. A dermatologist can prescribe targeted anti-inflammatory treatments such as topical corticosteroids or calcineurin inhibitors."
    elif "psoriasis" in msg:
        return "Psoriasis is an autoimmune, non-contagious condition that accelerates skin cell production, resulting in thick silvery plaques. It requires professional dermatological management, which may include targeted prescription topicals, phototherapy, or systemic biologic therapies."
    elif "dry" in msg or "flak" in msg:
        return "Dry skin typically indicates an impaired epidermal barrier. To restore moisture, wash with lukewarm water, use a gentle hydrating cleanser with hyaluronic acid or glycerin, and lock in hydration with a ceramide cream immediately after cleansing."
    elif "triage" in msg:
        return "TeleDerma AI triage classifies clinical cases into YELLOW (routine care / no escalation), ORANGE (dermatologist review recommended), and RED (urgent in-person hospital care required due to high-risk systemic symptoms)."
    elif any(w in msg for w in ["diagnos", "what do i have", "what is this", "cure"]):
        return "I cannot provide an individualized medical diagnosis through chat. To get an accurate clinical evaluation, please use 'Start Doctor Consultation' to upload high-resolution skin photos and connect directly with a verified dermatologist."
    else:
        return f"Regarding your question about '{user_message}': In dermatological care, symptoms often depend on skin type, barrier integrity, and duration. For routine skin wellness, gentle cleansing, barrier moisturization, and broad-spectrum sunscreen are recommended. If you have an active skin lesion or rash, you can start a consultation with our verified dermatologists for personalized care."


def get_chat_response(
    user_message: str,
    conversation_history: list | None = None
) -> dict:
    """
    Handles conversational multi-turn chat:
    1. Loads GEMINI_API_KEY from environment or .env
    2. Calls Gemini API using google-genai SDK (gemini-2.0-flash / gemini-1.5-flash)
    3. Normalizes multi-turn chat history (Gemini requires alternating user/model turns starting with user)
    4. Falls back to educational knowledge base if API key is not present or API call fails.
    Returns: dict {"reply": str, "disclaimer": str, "suggestions": list}
    """
    load_dotenv(override=True)
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()

    client = None
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
        except Exception as init_err:
            print(f"[Chatbot] Client initialization error: {init_err}")

    # Build and sanitize chat history for Gemini API
    history = conversation_history or []
    cleaned_history = []

    for turn in history:
        role = turn.get("role")
        content = str(turn.get("content", "")).strip()

        # Only accept user and model roles
        if role not in ("user", "model") or not content:
            continue

        # Rule: Gemini history cannot start with a 'model' turn
        if not cleaned_history and role != "user":
            continue

        # Rule: Roles must alternate; combine consecutive turns with same role
        if cleaned_history and cleaned_history[-1].role == role:
            cleaned_history[-1].parts[0].text += f"\n{content}"
        else:
            cleaned_history.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=content)],
                )
            )

    disclaimer = "AI-generated information is for general educational guidance only. It is not a medical diagnosis and does not replace consultation with a qualified dermatologist."

    # If client is ready, query Gemini models
    if client:
        # Try verified fast and available Gemini models with high reliability
        candidate_models = [
            "gemini-flash-lite-latest",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash",
            "gemini-3.8-flash",
            "gemini-flash-latest",
        ]
        for model_name in candidate_models:
            try:
                chat = client.chats.create(
                    model=model_name,
                    history=cleaned_history,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        max_output_tokens=500,
                        temperature=0.3,
                    ),
                )

                response = chat.send_message(message=user_message)
                if response and response.text:
                    reply_text = response.text.strip()
                    suggestions = generate_suggestions(user_message, reply_text)
                    return {
                        "reply": reply_text,
                        "disclaimer": disclaimer,
                        "suggestions": suggestions,
                    }
            except Exception as e:
                print(f"[Chatbot] Gemini API error with model '{model_name}': {e}")

    # Fallback response
    fallback_text = _fallback_education_response(user_message)
    suggestions = generate_suggestions(user_message, fallback_text)

    return {
        "reply": fallback_text,
        "disclaimer": disclaimer,
        "suggestions": suggestions,
    }