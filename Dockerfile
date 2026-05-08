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

# OCR pipeline: Nest spawns `uv run python ocr_extraction.py` (see OcrExtractionBridgeService).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY public ./public

COPY pyproject.toml uv.lock ./
COPY ocr_extraction.py ./

# Install Python deps into /app/.venv for `uv run` (frozen lockfile).
ENV UV_LINK_MODE=copy
RUN uv sync --frozen --no-dev

EXPOSE 3001

CMD ["node", "dist/main.js"]
