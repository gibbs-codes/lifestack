# Lifestack container image (multi-arch)
FROM node:20-slim AS base

# Install tini for proper signal handling and curl for healthchecks
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# Install dependencies separately for better caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Ensure node user ownership
RUN chown -R node:node /app
USER node

EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "index.js"]
