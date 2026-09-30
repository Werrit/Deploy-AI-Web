"""Streamlit interface for the four AI applications."""
import json
import os

import requests
import streamlit as st

API_URL = os.environ.get("API_URL", "http://127.0.0.1:8000")
MODE_LABELS = {
    "classifier": "1 · Nhận diện loài hoa (ResNet-18)",
    "detection": "2 · Phát hiện đối tượng (YOLO11n)",
    "retrieval": "3 · Tìm kiếm ảnh (CLIP + FAISS)",
    "llm": "4 · Trợ lý chăm sóc khách hàng (Qwen + RAG)",
}

st.title("AI Web Apps")

if "chat" not in st.session_state:
    st.session_state.chat = []

current_mode = st.session_state.get("app_mode", "llm")
if current_mode == "llm":
    st.info("Trợ lý trả lời dựa trên tài liệu chính sách ShopLite. Thử: *Đổi trả trong bao lâu?*")
    for message in st.session_state.chat:
        st.chat_message(message["role"]).markdown(message["content"])

mode = st.selectbox(
    "Chuyển ứng dụng",
    options=list(MODE_LABELS),
    format_func=MODE_LABELS.__getitem__,
    key="app_mode",
)

if mode == "llm":
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
            if sources:
                with st.expander("Nguồn đã dùng"):
                    for source in sources:
                        st.markdown(f"**{source['source']}** · điểm {source['score']}\n\n> {source['text'][:300]}…")

        st.session_state.chat += [
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": answer},
        ]
elif mode == "classifier":
    try:
        health = requests.get(f"{API_URL}/api/health", timeout=3).json()
    except requests.RequestException:
        health = {"models": {}}

    if not health.get("models", {}).get("classifier", False):
        st.warning("Mô hình chưa sẵn sàng. Tải dữ liệu và huấn luyện bằng `python -m core.train_classifier`, sau đó bật `classifier` trong `ENABLED_MODELS` rồi khởi động lại API.")
    else:
        uploaded_image = st.file_uploader("Tải ảnh hoa lên", type=["jpg", "jpeg", "png", "webp"])
        if uploaded_image:
            st.image(uploaded_image, caption=uploaded_image.name, width=360)
            if st.button("Nhận diện hoa", type="primary"):
                try:
                    response = requests.post(
                        f"{API_URL}/api/classifier/predict",
                        files={"file": (uploaded_image.name, uploaded_image.getvalue(), uploaded_image.type)},
                        timeout=120,
                    )
                    if response.ok:
                        result = response.json()
                        if not result["confident"]:
                            st.warning("Độ tin cậy thấp; ảnh có thể không thuộc 5 loài hoa trong bộ dữ liệu.")
                        for prediction in result["predictions"]:
                            st.write(f"**{prediction['label']}** · {prediction['score']:.1%}")
                    else:
                        st.error(response.json().get("detail", "Không thể phân loại ảnh."))
                except requests.RequestException as exc:
                    st.error(f"Không kết nối được API: {exc}")
elif mode == "detection":
    st.info("YOLO11n chưa được tích hợp trong phiên bản này.")
else:
    st.info("CLIP + FAISS chưa được tích hợp trong phiên bản này.")
