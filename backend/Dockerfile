# KrishiSetu API - for Hugging Face Spaces (Docker) or any Docker host.
# Hugging Face Spaces expects the app on port 7860.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860

# CPU-only PyTorch (the default wheel would download ~2 GB of CUDA libraries)
RUN pip install torch==2.0.1 torchvision==0.15.2 --index-url https://download.pytorch.org/whl/cpu

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# Run as a normal user that can write the data files (daily Agmarknet updates)
RUN useradd -m -u 1000 user
COPY --chown=user . .
USER user

EXPOSE 7860
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
