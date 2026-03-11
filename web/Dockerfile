# syntax=docker/dockerfile:1.7

FROM python:3.12-slim

WORKDIR /app

ENV PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copio el frontend Flask
COPY . .

EXPOSE 5000

# Gunicorn para producción simple
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]