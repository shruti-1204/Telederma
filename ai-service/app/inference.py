import torch
from torchvision import transforms
from PIL import Image
import io

from app.model import get_model, DEVICE

IMG_SIZE = 224

eval_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def run_inference(image_bytes: bytes, symptoms: dict, duration_days: int):
    model, class_to_idx, idx_to_class, feature_cols = get_model()

    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    image_tensor = eval_transform(image).unsqueeze(0).to(DEVICE)

    symptom_vector = []
    for col in feature_cols:
        if col == 'duration_encoded':
            symptom_vector.append(_encode_duration_days(duration_days))
        else:
            key = col.replace('condition_symptoms_', '').replace('_bin', '')
            symptom_vector.append(float(symptoms.get(key, 0)))

    symptom_tensor = torch.tensor([symptom_vector], dtype=torch.float32).to(DEVICE)

    with torch.no_grad():
        outputs = model(image_tensor, symptom_tensor)
        probs = torch.softmax(outputs, dim=1)[0]

    top_idx = int(torch.argmax(probs).item())
    confidence = float(probs[top_idx].item())
    predicted_class = idx_to_class[top_idx]

    top3_idx = torch.topk(probs, 3).indices.cpu().numpy()
    observations = [
        {"label": idx_to_class[int(i)], "confidence": round(float(probs[int(i)]), 3)}
        for i in top3_idx
    ]

    return predicted_class, confidence, observations


def _encode_duration_days(days: int) -> float:
    if days <= 1:
        return 0
    elif days <= 7:
        return 1
    elif days <= 28:
        return 2
    elif days <= 90:
        return 3
    elif days <= 365:
        return 4
    elif days <= 1825:
        return 5
    else:
        return 6