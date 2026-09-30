---
title: ShopLite Chatbot RAG
emoji: 💬
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# AI Web Apps

Giao diện hiện có hai ứng dụng: phân loại ảnh hoa bằng ResNet-18 fine-tune trên TF Flowers và trợ lý chăm sóc khách hàng Qwen + RAG trên sáu tài liệu ShopLite. YOLO11n và CLIP + FAISS được hiển thị trong bộ chọn nhưng chưa được tích hợp. `core/` chứa suy luận/huấn luyện, FastAPI giữ mô hình, Streamlit gọi API.

## Chạy trên máy

Yêu cầu Python 3.13 trở lên theo `pyproject.toml`. Cài thư viện bằng `pip install -r requirements.txt` (hoặc `uv sync`). Huấn luyện classifier một lần; lệnh sẽ tự tải Flowers và pretrained ResNet-18 nếu chưa có:

```bash
python -m core.train_classifier
```

Mặc định chạy 5 epoch; có thể dùng `--epochs` và `--batch-size` để điều chỉnh. Checkpoint và chỉ số Accuracy, macro-F1, ma trận nhầm lẫn được lưu trong `artifacts/classifier/` (không đưa checkpoint vào Git). Bật classifier cùng chatbot bằng biến môi trường `ENABLED_MODELS=llm,classifier` trước khi chạy API. Lần đầu chạy chatbot, mô hình ngôn ngữ cũng được tải từ Hugging Face.

Mở hai terminal tại thư mục dự án:

```bash
uvicorn api.main:app --port 8000
```

```bash
streamlit run streamlit_app.py
```

Giao diện ở `http://localhost:8501`, API ở `http://localhost:8000/docs`, trạng thái mô hình ở `http://localhost:8000/api/health`. Chạy test API không cần tải mô hình bằng `python -m unittest discover -s tests -v`.

## Ghép với hai ứng dụng còn lại

Chatbot và classifier có router riêng trong `api/routers/`. Mỗi ứng dụng mới đặt phần suy luận trong `core/`, tạo router riêng, rồi thêm router bằng `app.include_router(...)` và đăng ký lớp nạp trong `LOADERS` ở `api/main.py`. Bật tên mô hình tương ứng qua `ENABLED_MODELS`.

## Hugging Face Spaces

Tài khoản Hugging Face cần gói **PRO** để tạo Space Docker. Tạo Space loại **Docker** và đưa các tệp trong dự án lên Space. Docker chạy FastAPI ở cổng nội bộ 8000 và Streamlit ở cổng công khai 7860. Trên CPU, mặc định dùng `Qwen/Qwen2.5-0.5B-Instruct` như notebook. Space cần tải mô hình khi khởi động lần đầu.

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `ENABLED_MODELS` | `llm` | Bật/tắt mô hình, ví dụ `llm,classifier` |
| `LLM_MODEL` | Qwen2.5 1.5B (GPU) / 0.5B (CPU) | Mô hình sinh câu trả lời |
| `EMBED_MODEL` | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Mô hình truy xuất |
| `API_URL` | `http://127.0.0.1:8000` | Địa chỉ FastAPI mà Streamlit gọi |

Thêm hoặc sửa tài liệu `.md` trong `data/kb/`; dùng tiêu đề `##` để chia đoạn như notebook.
