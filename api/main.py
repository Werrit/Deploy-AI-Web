"""FastAPI app setup and model loading for the AI web apps."""
import importlib
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from api.routers.chat import router as chat_router
from config import CORS_ORIGINS, DEVICE, ENABLED_MODELS

log = logging.getLogger("api")
MODELS: dict = {}
LOADERS = {"llm": ("core.llm", "RAGChatbot")}


def _load_models():
    for name, (module, cls) in LOADERS.items():
        if name not in ENABLED_MODELS:
            continue
        t0 = time.perf_counter()
        try:
            MODELS[name] = getattr(importlib.import_module(module), cls)()
            log.info("loaded %s in %.1fs", name, time.perf_counter() - t0)
        except Exception:
            log.exception("cannot load %s", name)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_models()
    yield
    MODELS.clear()


app = FastAPI(title="AI Web Apps API", version="1.0.0", lifespan=lifespan)
app.state.models = MODELS
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])
app.include_router(chat_router)


@app.middleware("http")
async def timing(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time-ms"] = f"{(time.perf_counter() - t0) * 1000:.1f}"
    return response


@app.get("/api/health")
def health():
    return {"status": "ok", "device": DEVICE, "models": {name: name in MODELS for name in sorted(ENABLED_MODELS)}}
