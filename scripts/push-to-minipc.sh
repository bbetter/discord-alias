#!/usr/bin/env bash
set -e

### === CONFIG ===
IMAGE_NAME="discord-alias"
IMAGE_TAG="latest"

MINIPC_USER="andri"
MINIPC_HOST="192.168.0.108"
MINIPC_COMPOSE_DIR="./docker"
SERVICE_NAME="discord-alias"

# Використати змінну з environment якщо вона є, інакше завантажити з .env
if [ -z "$VITE_DISCORD_CLIENT_ID" ]; then
  echo "⚠ VITE_DISCORD_CLIENT_ID not in environment, loading from .env..."
  if [ -f .env ]; then
    # shellcheck disable=SC1091
    source .env
  else
    echo "❌ Error: VITE_DISCORD_CLIENT_ID not set and .env file not found!"
    exit 1
  fi
fi

# Перевірити що CLIENT_ID встановлений
if [ -z "$VITE_DISCORD_CLIENT_ID" ]; then
  echo "❌ Error: VITE_DISCORD_CLIENT_ID not set!"
  exit 1
fi

echo "✓ Using VITE_DISCORD_CLIENT_ID: ${VITE_DISCORD_CLIENT_ID:0:10}..." # показати перші 10 символів
### =================

echo "▶ Building docker image..."
docker build --build-arg VITE_DISCORD_CLIENT_ID=${VITE_DISCORD_CLIENT_ID} -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "▶ Pushing image to mini PC via SSH..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | ssh ${MINIPC_USER}@${MINIPC_HOST} docker load

echo "▶ Restarting service via docker compose..."
#shellcheck disable=SC2087
ssh ${MINIPC_USER}@${MINIPC_HOST} <<EOF
  set -e
  cd ${MINIPC_COMPOSE_DIR}
  docker compose up -d ${SERVICE_NAME}
EOF

echo "✅ Deploy finished successfully"
