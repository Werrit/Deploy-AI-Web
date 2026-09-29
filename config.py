"""Shared configuration for the ShopLite chatbot."""
import os
from pathlib import Path

import torch

ROOT = Path(os.environ.get("APP_ROOT", Path(__file__).resolve().parent))
DATA_DIR = ROOT / "data"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
EMBED_MODEL = os.environ.get("EMBED_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
LLM_MODEL = os.environ.get(
    "LLM_MODEL",
    "Qwen/Qwen2.5-1.5B-Instruct" if DEVICE == "cuda" else "Qwen/Qwen2.5-0.5B-Instruct",
)
ENABLED_MODELS = {m.strip() for m in os.environ.get("ENABLED_MODELS", "llm").split(",") if m.strip()}
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:8501").split(",")
