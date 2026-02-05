#!/bin/bash

# Lifestack container deployment script
# Pulls prebuilt image and restarts docker compose service on Raspberry Pi

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

printf "${BLUE}\n"
printf "╔════════════════════════════════════════════╗\n"
printf "║     Lifestack Container Deployment        ║\n"
printf "╚════════════════════════════════════════════╝\n"
printf "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  printf "${RED}Error: Do not run this script as root${NC}\n"
  exit 1
fi

# Paths and defaults
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/home/james/apps/lifestack"
IMAGE="${IMAGE:-ghcr.io/jgibbswork/lifestack:latest}"
ENV_FILE="${ENV_FILE:-$TARGET_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$TARGET_DIR/docker-compose.yml}"
GOOGLE_CREDENTIALS_PATH="${GOOGLE_CREDENTIALS_PATH:-$TARGET_DIR/credentials.json}"

printf "${BLUE}📍 Working directory: ${SCRIPT_DIR}${NC}\n"

# If running from GitHub Actions workspace, sync compose + scripts to target directory
if [[ "$SCRIPT_DIR" == *"actions-runner"* ]]; then
  printf "${BLUE}📂 Detected GitHub Actions deployment${NC}\n"
  printf "${BLUE}📂 Syncing compose files to ${TARGET_DIR}...${NC}\n"
  mkdir -p "$TARGET_DIR"
  rsync -av --delete --exclude 'node_modules' --exclude '.git' --exclude '.env' "$SCRIPT_DIR/" "$TARGET_DIR/"
  printf "${GREEN}✅ Files synced to ${TARGET_DIR}${NC}\n"
  cd "$TARGET_DIR"
else
  cd "$SCRIPT_DIR"
  printf "${BLUE}📍 Running directly from: ${SCRIPT_DIR}${NC}\n"
fi

# Basic prerequisites
if ! command -v docker &> /dev/null; then
  printf "${RED}❌ Error: docker not installed${NC}\n"
  exit 1
fi
if ! docker compose version &> /dev/null; then
  printf "${RED}❌ Error: docker compose plugin not installed${NC}\n"
  exit 1
fi

# Validate required files
printf "\n${BLUE}🔍 Checking required files...${NC}\n"

if [ ! -f "$ENV_FILE" ]; then
  printf "${RED}❌ Error: env file not found at $ENV_FILE${NC}\n"
  exit 1
fi

if [ ! -f "$GOOGLE_CREDENTIALS_PATH" ]; then
  printf "${YELLOW}⚠️  Warning: credentials.json missing at $GOOGLE_CREDENTIALS_PATH${NC}\n"
  printf "${YELLOW}   Calendar features may be disabled unless GOOGLE_CREDENTIALS_PATH is set${NC}\n"
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  printf "${RED}❌ Error: docker-compose.yml not found at $COMPOSE_FILE${NC}\n"
  exit 1
fi

printf "${GREEN}✅ Files ready${NC}\n"

printf "\n${BLUE}⬇️  Pulling image ${IMAGE}${NC}\n"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull lifestack

printf "\n${BLUE}🚀 Starting container...${NC}\n"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d lifestack

printf "\n${BLUE}📊 Service status:${NC}\n"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

PORT=${PORT:-3003}
LOCAL_IP=$(hostname -I | awk '{print $1}')
printf "\n${BLUE}🔗 Test URLs:${NC}\n"
printf "   Health Check:    http://localhost:${PORT}/health\n"
printf "   Health Check (LAN): http://${LOCAL_IP}:${PORT}/health\n"
printf "${GREEN}\n✅ Deployment complete${NC}\n"
