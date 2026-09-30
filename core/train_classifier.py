"""Download TF Flowers and train the ResNet-18 flower classifier."""
import argparse
import json
import random
import tarfile
import urllib.request

import torch
from torch.utils.data import DataLoader, Subset
from torchvision.datasets import ImageFolder

from config import ART_DIR, DATA_DIR, DEVICE
from core.classifier import EVAL_TF, TRAIN_TF, build_model

FLOWERS_DIR = DATA_DIR / "flowers" / "flower_photos"
FLOWERS_URL = "https://storage.googleapis.com/download.tensorflow.org/example_images/flower_photos.tgz"


def download_flowers():
    if not FLOWERS_DIR.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        archive = DATA_DIR / "flower_photos.tgz"
        urllib.request.urlretrieve(FLOWERS_URL, archive)
        with tarfile.open(archive) as tar:
            tar.extractall(DATA_DIR / "flowers", filter="data")
        archive.unlink()
    (FLOWERS_DIR / "LICENSE.txt").unlink(missing_ok=True)
    return FLOWERS_DIR


def split_indices(targets: list[int], seed: int = 42) -> tuple[list[int], list[int], list[int]]:
    rng = random.Random(seed)
    train_indices, val_indices, test_indices = [], [], []
    for class_id in sorted(set(targets)):
        indices = [index for index, target in enumerate(targets) if target == class_id]
        rng.shuffle(indices)
        train_end = int(len(indices) * 0.8)
        val_end = int(len(indices) * 0.9)
        train_indices.extend(indices[:train_end])
        val_indices.extend(indices[train_end:val_end])
        test_indices.extend(indices[val_end:])
    return train_indices, val_indices, test_indices


def evaluate(model: torch.nn.Module, loader: DataLoader, num_classes: int) -> dict:
    confusion = [[0 for _ in range(num_classes)] for _ in range(num_classes)]
    model.eval()
    with torch.inference_mode():
        for images, labels in loader:
            predictions = model(images.to(DEVICE)).argmax(dim=1).cpu().tolist()
            for actual, predicted in zip(labels.tolist(), predictions):
                confusion[actual][predicted] += 1
    total = sum(map(sum, confusion))
    accuracy = sum(confusion[i][i] for i in range(num_classes)) / total
    class_f1 = []
    for class_id in range(num_classes):
        true_positive = confusion[class_id][class_id]
        false_positive = sum(confusion[row][class_id] for row in range(num_classes)) - true_positive
        false_negative = sum(confusion[class_id]) - true_positive
        denominator = 2 * true_positive + false_positive + false_negative
        class_f1.append(2 * true_positive / denominator if denominator else 0.0)
    return {"test_accuracy": accuracy, "test_macro_f1": sum(class_f1) / num_classes,
            "confusion_matrix": confusion}


def train(epochs: int = 5, batch_size: int = 64, seed: int = 42) -> dict:
    torch.manual_seed(seed)
    flowers_dir = download_flowers()
    base = ImageFolder(flowers_dir)
    train_indices, val_indices, test_indices = split_indices(base.targets, seed)
    train_set = Subset(ImageFolder(flowers_dir, transform=TRAIN_TF), train_indices)
    val_set = Subset(ImageFolder(flowers_dir, transform=EVAL_TF), val_indices)
    test_set = Subset(ImageFolder(flowers_dir, transform=EVAL_TF), test_indices)
    loader_options = {"batch_size": batch_size, "num_workers": 0, "pin_memory": DEVICE == "cuda"}
    train_loader = DataLoader(train_set, shuffle=True, **loader_options)
    val_loader = DataLoader(val_set, shuffle=False, **loader_options)
    test_loader = DataLoader(test_set, shuffle=False, **loader_options)

    model = build_model(len(base.classes)).to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)
    criterion = torch.nn.CrossEntropyLoss(label_smoothing=0.1)
    best_accuracy = -1.0
    history = []
    artifact_dir = ART_DIR / "classifier"
    artifact_dir.mkdir(parents=True, exist_ok=True)

    for epoch in range(1, epochs + 1):
        model.train()
        for images, labels in train_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer.step()

        model.eval()
        correct = total = 0
        with torch.inference_mode():
            for images, labels in val_loader:
                predictions = model(images.to(DEVICE)).argmax(dim=1).cpu()
                correct += (predictions == labels).sum().item()
                total += len(labels)
        val_accuracy = correct / total
        history.append({"epoch": epoch, "val_accuracy": val_accuracy})
        print(f"epoch {epoch}/{epochs}: val_accuracy={val_accuracy:.4f}")
        if val_accuracy > best_accuracy:
            best_accuracy = val_accuracy
            torch.save(model.state_dict(), artifact_dir / "model.pt")

    best_model = build_model(len(base.classes), pretrained=False).to(DEVICE)
    best_model.load_state_dict(torch.load(artifact_dir / "model.pt", map_location=DEVICE, weights_only=True))
    metrics = evaluate(best_model, test_loader, len(base.classes))
    metrics.update({"epochs": epochs, "history": history, "model": "resnet18-imagenet-finetune"})
    (artifact_dir / "classes.json").write_text(json.dumps(base.classes), encoding="utf-8")
    (artifact_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (artifact_dir / "split.json").write_text(json.dumps({
        "train": train_indices, "val": val_indices, "test": test_indices,
    }), encoding="utf-8")
    print(f"Test accuracy={metrics['test_accuracy']:.4f}, macro_f1={metrics['test_macro_f1']:.4f}")
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    train(epochs=args.epochs, batch_size=args.batch_size, seed=args.seed)