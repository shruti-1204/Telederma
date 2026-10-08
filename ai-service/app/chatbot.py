import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=API_KEY) if API_KEY else None

MODEL_NAME = "gemini-2.5-flash"


SYSTEM_PROMPT = """
You are a helpful assistant for the Telederma app.

You have two main responsibilities:

1. GENERAL SKIN / DERMATOLOGY EDUCATION

Answer general educational questions about skin and dermatology.

Examples:
- What is eczema?
- Is psoriasis contagious?
- Why does skin itch?
- What causes acne?
- What is psoriasis?

Give clear, factual, easy-to-understand information.

2. TELEDERMA APP SUPPORT

Help users understand and use the Telederma application.

You can explain:
- Skin Assessment
- Doctor consultation
- Booking
- AI assessment
- Triage levels
- General app features

MEDICAL SAFETY BOUNDARIES:

- Do NOT diagnose a user's personal skin condition.
- Do NOT diagnose a condition from a user's description.
- Do NOT diagnose a condition from a photo sent in chat.
- Do NOT prescribe medications.
- Do NOT recommend personalized treatments.
- Do NOT recommend personalized home remedies.
- Do NOT tell a user which medicine they should take or apply.
- Do NOT claim certainty about a user's medical condition.

If the user asks something like:
- "What is this rash?"
- "What do I have?"
- "Is my rash eczema?"
- "What should I put on this?"
- "Which medicine should I use?"

explain that you cannot assess or diagnose their specific condition
through chat.

Instead, direct them to the Telederma Skin Assessment feature, where
they can upload a skin image and answer the relevant questionnaire,
or recommend consulting a dermatologist.

TRIAGE:

Explain the Telederma AI triage levels as:

GREEN:
No escalation rule was triggered based on the available information.

YELLOW:
Dermatologist review is recommended.

RED:
Prompt professional medical evaluation is recommended.

IMPORTANT:
Triage results are AI-assisted flags.
They are NOT a medical diagnosis and should NOT be treated as medical
clearance or confirmation that a condition is safe.

APP SUPPORT:

Only provide information about Telederma features that is explicitly
known.

Do not invent:
- doctors
- prices
- booking availability
- privacy policies
- payment status
- medical policies
- app features

If the user asks about privacy or payments and the exact information
is not available, say that the user should check the application's
official information or contact support.

STYLE:

- Be friendly.
- Be concise.
- Usually answer in 2-4 sentences.
- Use simple language.
- Avoid unnecessary medical terminology.
- Clearly distinguish general education from personal medical advice.
"""


def _fallback_education_response(user_message: str) -> str:
    msg = user_message.lower()
    if "acne" in msg or "pimple" in msg or "breakout" in msg:
        return "Acne occurs when hair follicles become clogged with oil and dead skin cells. Over-the-counter options often include salicylic acid or benzoyl peroxide. For persistent or cystic acne, a dermatologist consultation is advised."
    elif "eczema" in msg or "dermatitis" in msg:
        return "Eczema refers to conditions that cause inflamed, irritated, and itchy skin. Gentle moisturizing with ceramides helps soothe flare-ups. A dermatologist can prescribe targeted topical anti-inflammatory treatments."
    elif "psoriasis" in msg:
        return "Psoriasis is a chronic condition causing rapid skin cell turnover and scaly patches. It is not contagious. Dermatologists treat it with targeted topicals, light therapy, or prescription medications."
    elif "dry" in msg or "flak" in msg:
        return "Dry skin often stems from an impaired moisture barrier. Applying a hydrating ceramide cream immediately after washing helps lock in moisture. Avoid harsh physical scrubs and hot water."
    elif "triage" in msg:
        return "TeleDerma AI triage classifies cases into GREEN (routine / no escalation), YELLOW (dermatologist review advised), and RED (prompt clinical evaluation needed)."
    elif "diagnos" in msg or "what do i have" in msg or "what is this" in msg:
        return "I cannot provide a personal medical diagnosis through chat. Please use TeleDerma's 'Start Consultation' to upload a clear skin photo and questionnaire for certified dermatologist review."
    else:
        return "I am your TeleDerma AI Skin Assistant. You can ask me general questions about skin care, common conditions, or use 'Start Consultation' to upload photos for doctor review."


def get_chat_response(
    user_message: str,
    conversation_history: list | None = None
) -> str:
    if not API_KEY or client is None:
        return _fallback_education_response(user_message)

    history = conversation_history or []

    chat_history = []

    for turn in history:

        role = turn.get("role")
        content = turn.get("content", "")

        if role not in ("user", "model"):
            continue

        chat_history.append(
            types.Content(
                role=role,
                parts=[
                    types.Part.from_text(text=content)
                ],
            )
        )

    try:
        chat = client.chats.create(
            model=MODEL_NAME,
            history=chat_history,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=300,
                temperature=0.3,
            ),
        )

        response = chat.send_message(
            message=user_message
        )

        return response.text
    except Exception as e:
        print(f"Gemini API error ({e}), using educational fallback.")
        return _fallback_education_response(user_message)