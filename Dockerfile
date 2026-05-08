FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build


FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    # Required by docTR / OpenCV
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv via pip3 — guaranteed to land in /usr/local/bin/uv
RUN pip3 install uv --break-system-packages

# Verify uv is callable at the expected path
RUN uv --version && ls -la $(which uv)

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY public ./public
COPY ocr_extraction.py ./
COPY pyproject.toml ./

# Resolve and install Python deps from pyproject.toml (no lockfile needed)
RUN uv sync

EXPOSE 8080
CMD ["node", "dist/main.js"]