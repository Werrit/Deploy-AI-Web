"""HTTP endpoints for the ShopLite RAG chatbot."""
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: list[dict] = Field(default_factory=list)


def _require_bot(request: Request):
    bot = request.app.state.models.get("llm")
    if bot is None:
        raise HTTPException(503, "Mô hình 'llm' chưa được nạp (xem /api/health)")
    return bot


@router.post("")
def chat(req: ChatRequest, request: Request):
    contexts, tokens = _require_bot(request).stream(req.message, req.history)

    def events():
        yield f"data: {json.dumps({'type': 'sources', 'items': contexts}, ensure_ascii=False)}\n\n"
        for piece in tokens:
            yield f"data: {json.dumps({'type': 'token', 'text': piece}, ensure_ascii=False)}\n\n"
        yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(events(), media_type="text/event-stream; charset=utf-8", headers={"Cache-Control": "no-cache"})


@router.post("/sync")
def chat_sync(req: ChatRequest, request: Request):
    return _require_bot(request).answer(req.message, req.history)
