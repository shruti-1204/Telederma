# TeleDerma AI Microservice Integration

## 1. Architecture Flow
```
Patient App ──(Upload Image)──> Node.js Backend ──(Internal HTTP)──> Python/FastAPI AI Service
                                       │                                      │
                                       │<──────(JSON Assessment / Triage)─────┘
                                       │
                                       ├── Saves AiAssessment in PostgreSQL
                                       ├── Records Model Version
                                       └── Returns clinical support data to Patient & Doctor
```

## 2. Python/FastAPI Internal Contract

### Endpoint 1: Image Quality Analyzer
- **URL**: `POST /internal/ai/image-quality`
- **Request**:
  ```json
  {
    "imageUrl": "https://...",
    "storageKey": "skin-images/xxx.jpg"
  }
  ```
- **Response**:
  ```json
  {
    "quality": "ACCEPTABLE",
    "confidence": 0.94,
    "blurScore": 0.08,
    "isAcceptable": true,
    "modelVersion": "telederma-ai-v1.0.0"
  }
  ```

### Endpoint 2: Condition Assessment & Triage
- **URL**: `POST /internal/ai/assessment`
- **Request**:
  ```json
  {
    "imageUrl": "https://...",
    "storageKey": "skin-images/xxx.jpg"
  }
  ```
- **Response**:
  ```json
  {
    "assessment": "Clinical assessment text",
    "riskLevel": "GREEN",
    "imageQuality": "HIGH",
    "confidence": 0.91,
    "differentialDiagnoses": [
      { "condition": "Atopic Dermatitis", "probability": 0.72 }
    ],
    "modelVersion": "telederma-ai-v1.0.0"
  }
  ```

## 3. Strict Triage Rules
- `riskLevel` must strictly evaluate to **`GREEN`**, **`YELLOW`**, or **`RED`**.
- AI findings are treated solely as clinical decision support.
- Doctors have full authorization to override AI risk levels and notes via `POST /api/v1/ai/assessments/:id/override`, which generates an immutable audit record.
