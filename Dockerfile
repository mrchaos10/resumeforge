FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl wget git libssl-dev libfontconfig1 pkg-config nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Install tectonic LaTeX compiler
RUN wget -qO /usr/local/bin/tectonic \
    https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz \
    || true
RUN wget -qO- https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz \
    | tar xz -C /usr/local/bin/ && chmod +x /usr/local/bin/tectonic

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY frontend/package.json ./frontend/package.json
WORKDIR /app/frontend
RUN npm install

COPY frontend/ ./
RUN npm run build

WORKDIR /app
COPY backend/ ./backend/
RUN mkdir -p backend/static && cp -r frontend/build/* backend/static/

EXPOSE 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
