# Build stage: compile native modules (opus, sodium, opusscript)
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libtool \
    autoconf \
    automake \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Runtime stage
FROM node:20-slim

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Run as non-root (node user ships with the base image)
USER node

CMD ["node", "bot.js"]
