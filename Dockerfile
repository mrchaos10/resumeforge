FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    xz-utils \
    libssl-dev \
    libfontconfig1 \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install tectonic LaTeX compiler
RUN wget -qO- https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz \
    | tar xz -C /usr/local/bin/ \
    || echo "tectonic install failed, will use pdflatex fallback"

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Build React frontend (Vite outputs to frontend/dist/)
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install && npm run build

# Copy built frontend to /app/static for FastAPI to serve
WORKDIR /app
RUN mkdir -p /app/static && cp -r /app/frontend/dist/. /app/static/

# Copy backend
COPY backend/ ./backend/

EXPOSE 7860

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
