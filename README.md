---
title: ShopLite Chatbot RAG
emoji: 💬
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# ShopLite Chatbot RAG

Chatbot chăm sóc khách hàng theo ứng dụng 4 trong notebook `AI_Web_Apps_Streamlit_React.ipynb`: sáu tài liệu chính sách ShopLite được chia theo mục `##`, truy xuất bằng MiniLM đa ngôn ngữ và FAISS, rồi Qwen trả lời bằng tiếng Việt và dẫn nguồn. `core/` chỉ suy luận, FastAPI giữ mô hình, Streamlit gọi API.

## Chạy trên máy

Yêu cầu Python 3.11 trở lên. Cài thư viện bằng `pip install -r requirements.txt` (hoặc `uv sync` nếu dùng `pyproject.toml`). Lần đầu chạy, mô hình được tải từ Hugging Face.

Mở hai terminal tại thư mục dự án:

```bash
uvicorn api.main:app --port 8000
```

```bash
streamlit run streamlit_app.py
```

Giao diện ở `http://localhost:8501`, API ở `http://localhost:8000/docs`, trạng thái mô hình ở `http://localhost:8000/api/health`. Chạy test API không cần tải mô hình bằng `python -m unittest discover -s tests -v`.

## Ghép với ba ứng dụng còn lại

Chatbot có router riêng tại `api/routers/chat.py`. Mỗi nhóm đặt phần suy luận trong `core/`, tạo router riêng trong `api/routers/`, rồi thêm router bằng `app.include_router(...)` và đăng ký lớp nạp mô hình trong `LOADERS` ở `api/main.py`. Bật tên mô hình tương ứng qua `ENABLED_MODELS`; không cần sửa router chatbot.

## Hugging Face Spaces

Tài khoản Hugging Face cần gói **PRO** để tạo Space Docker. Tạo Space loại **Docker** và đưa các tệp trong dự án lên Space. Docker chạy FastAPI ở cổng nội bộ 8000 và Streamlit ở cổng công khai 7860. Trên CPU, mặc định dùng `Qwen/Qwen2.5-0.5B-Instruct` như notebook. Space cần tải mô hình khi khởi động lần đầu.

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `ENABLED_MODELS` | `llm` | Bật/tắt mô hình chatbot |
| `LLM_MODEL` | Qwen2.5 1.5B (GPU) / 0.5B (CPU) | Mô hình sinh câu trả lời |
| `EMBED_MODEL` | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Mô hình truy xuất |
| `API_URL` | `http://127.0.0.1:8000` | Địa chỉ FastAPI mà Streamlit gọi |

Thêm hoặc sửa tài liệu `.md` trong `data/kb/`; dùng tiêu đề `##` để chia đoạn như notebook.
