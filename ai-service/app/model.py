import torch
import torch.nn as nn
import timm
from pathlib import Path

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

class MultimodalFusionModel(nn.Module):
    def __init__(self, num_classes, num_symptom_features):
        super().__init__()
        self.image_backbone = timm.create_model('efficientnet_b0', pretrained=False, num_classes=num_classes)
        self.image_backbone.reset_classifier(0)
        image_feature_dim = 1280

        self.symptom_encoder = nn.Sequential(
            nn.Linear(num_symptom_features, 32),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(32, 32),
            nn.ReLU(),
        )
        symptom_feature_dim = 32

        self.classifier = nn.Sequential(
            nn.Linear(image_feature_dim + symptom_feature_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(256, num_classes)
        )

    def forward(self, image, symptoms):
        img_features = self.image_backbone(image)
        symptom_features = self.symptom_encoder(symptoms)
        combined = torch.cat([img_features, symptom_features], dim=1)
        return self.classifier(combined)


_model = None
_class_to_idx = None
_idx_to_class = None
_feature_cols = None

def load_model():
    """Load the trained fusion model once, at startup."""
    global _model, _class_to_idx, _idx_to_class, _feature_cols

    checkpoint_path = Path(__file__).parent / "models" / "best_fusion_model.pth"
    checkpoint = torch.load(checkpoint_path, map_location=DEVICE)

    _class_to_idx = checkpoint['class_to_idx']
    _idx_to_class = checkpoint['idx_to_class']
    _feature_cols = checkpoint['feature_cols']

    model = MultimodalFusionModel(
        num_classes=len(_class_to_idx),
        num_symptom_features=len(_feature_cols)
    )
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(DEVICE)
    model.eval()

    _model = model
    print(f"Model loaded. Classes: {list(_class_to_idx.keys())}")
    return model

def get_model():
    if _model is None:
        load_model()
    return _model, _class_to_idx, _idx_to_class, _feature_cols