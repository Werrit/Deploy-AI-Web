FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt

COPY config.py streamlit_app.py ./
COPY core/ core/
COPY api/ api/
COPY data/ data/
COPY artifacts/ artifacts/

ENV APP_ROOT=/app HF_HOME=/app/.cache LLM_MODEL=Qwen/Qwen2.5-0.5B-Instruct API_URL=http://127.0.0.1:8000
RUN useradd -m app && chown -R app /app
USER app

EXPOSE 7860
CMD ["sh", "-c", "uvicorn api.main:app --host 127.0.0.1 --port 8000 & exec streamlit run streamlit_app.py --server.address 0.0.0.0 --server.port 7860 --server.headless true"]
