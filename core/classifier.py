"""Ứng dụng 1 — phân loại ảnh hoa bằng ResNet-18 fine-tune."""
import json
from pathlib import Path

import torch
from PIL import Image
from torchvision import models, transforms

from config import ART_DIR, DEVICE

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

TRAIN_TF = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(0.2, 0.2, 0.2),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])
EVAL_TF = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])


def build_model(num_classes: int, pretrained: bool = True) -> torch.nn.Module:
    weights = models.ResNet18_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.resnet18(weights=weights)
    model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
    return model


class ImageClassifier:
    def __init__(self, model_dir: Path = ART_DIR / "classifier", min_confidence: float = 0.5):
        model_dir = Path(model_dir)
        classes_path = model_dir / "classes.json"
        weights_path = model_dir / "model.pt"
        if not classes_path.is_file() or not weights_path.is_file():
            raise FileNotFoundError(
                f"Chưa có checkpoint phân loại hoa tại {model_dir}. "
                "Hãy chạy: python -m core.train_classifier"
            )
        self.classes: list[str] = json.loads(classes_path.read_text(encoding="utf-8"))
        self.model = build_model(len(self.classes), pretrained=False)
        state = torch.load(weights_path, map_location=DEVICE, weights_only=True)
        self.model.load_state_dict(state)
        self.model.to(DEVICE).eval()
        self.min_confidence = min_confidence

    @torch.inference_mode()
    def predict(self, image: Image.Image, top_k: int = 3) -> dict:
        tensor = EVAL_TF(image.convert("RGB")).unsqueeze(0).to(DEVICE)
        probabilities = self.model(tensor).softmax(dim=-1)[0]
        scores, indices = probabilities.topk(min(top_k, len(self.classes)))
        predictions = [
            {"label": self.classes[index], "score": round(float(score), 4)}
            for score, index in zip(scores.tolist(), indices.tolist())
        ]
        return {
            "predictions": predictions,
            "confident": predictions[0]["score"] >= self.min_confidence,
        }