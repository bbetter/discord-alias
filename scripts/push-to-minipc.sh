#!/usr/bin/env bash
set -e

### === CONFIG ===
IMAGE_NAME="discord-alias"
IMAGE_TAG="latest"

MINIPC_USER="andri"
MINIPC_HOST="192.168.0.108"
MINIPC_COMPOSE_DIR="./docker"
SERVICE_NAME="discord-alias"

# Discord client ID (для білда клієнта)
VITE_DISCORD_CLIENT_ID="REMOVED_CLIENT_ID"
### =================

echo "▶ Building docker image..."
docker build --build-arg VITE_DISCORD_CLIENT_ID=${VITE_DISCORD_CLIENT_ID} -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "▶ Pushing image to mini PC via SSH..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | ssh ${MINIPC_USER}@${MINIPC_HOST} docker load

echo "▶ Restarting service via docker compose..."
ssh ${MINIPC_USER}@${MINIPC_HOST} << EOF
  set -e
  cd ${MINIPC_COMPOSE_DIR}
  docker compose up -d ${SERVICE_NAME}
EOF

echo "✅ Deploy finished successfully"
