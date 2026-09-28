# =========================
# Stage 1: Build React frontend
# =========================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# =========================
# Stage 2: Python backend
# =========================
FROM python:3.13-slim

WORKDIR /app

# Prevent Python from creating .pyc files
# and make logs appear immediately
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install Python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend
COPY backend/ /app/backend/

# Copy datasets required by the investigation engine
COPY datasets/ /app/datasets/

# Copy production React build
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Railway provides PORT automatically
EXPOSE 8000

# Start FastAPI
CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]