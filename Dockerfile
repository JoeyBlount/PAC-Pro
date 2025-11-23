# PAC-Pro/Dockerfile  (BACKEND)
FROM python:3.12-slim

WORKDIR /app

# deps live under server/python_backend
COPY server/python_backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# copy backend code only
COPY server/python_backend ./server/python_backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    PROJECT_ROOT=/app \
    PYTHONPATH=/app:/app/server/python_backend

# shell form so $PORT resolves
CMD ["sh", "-c", "uvicorn server.python_backend.main:app --host 0.0.0.0 --port $PORT"]
