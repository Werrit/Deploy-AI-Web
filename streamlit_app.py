"""Streamlit client for the ShopLite chatbot; inference lives in FastAPI."""
import json
import os

import requests
import streamlit as st

API_URL = os.environ.get("API_URL", "http://127.0.0.1:8000")

st.title("💬 Trợ lý ShopLite (RAG)")
st.info("Trợ lý trả lời dựa trên tài liệu chính sách ShopLite. Thử: *Đổi trả trong bao lâu?*")

if "chat" not in st.session_state:
    st.session_state.chat = []

for message in st.session_state.chat:
    st.chat_message(message["role"]).markdown(message["content"])

if prompt := st.chat_input("Nhập câu hỏi…"):
    st.chat_message("user").markdown(prompt)
    sources = []

    def stream():
        with requests.post(
            f"{API_URL}/api/chat",
            json={"message": prompt, "history": st.session_state.chat},
            stream=True,
            timeout=300,
        ) as response:
            response.raise_for_status()
            response.encoding = "utf-8"
            for line in response.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data: "):
                    continue
                event = json.loads(line[6:])
                if event["type"] == "sources":
                    sources.extend(event["items"])
                elif event["type"] == "token":
                    yield event["text"]

    with st.chat_message("assistant"):
        try:
            answer = st.write_stream(stream())
        except requests.RequestException as exc:
            answer = f"Lỗi: {exc}"
            st.error(answer)
        with st.expander("Nguồn đã dùng"):
            for source in sources:
                st.markdown(f"**{source['source']}** · điểm {source['score']}\n\n> {source['text'][:300]}…")

    st.session_state.chat += [
        {"role": "user", "content": prompt},
        {"role": "assistant", "content": answer},
    ]
