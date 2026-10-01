FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt

COPY config.py streamlit_app.py ./
COPY core/ core/
COPY api/ api/
COPY data/kb/ data/kb/
COPY artifacts/classifier/ artifacts/classifier/
COPY web/ web/

ENV APP_ROOT=/app HF_HOME=/app/.cache LLM_MODEL=Qwen/Qwen2.5-0.5B-Instruct PORT=7860
RUN useradd -m app && chown -R app /app
USER app

EXPOSE 7860
CMD ["python", "streamlit_app.py"]
