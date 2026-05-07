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
ENV PATH="/root/.local/bin:$PATH"

# Install Python + curl
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Copy Python files and install dependencies
COPY pyproject.toml uv.lock ./
COPY ocr_extraction.py ./
RUN uv sync --frozen

# Copy Node app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY public ./public

EXPOSE 8080

CMD ["node", "dist/main.js"]