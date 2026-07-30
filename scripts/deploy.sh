#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker/docker-compose.yml"
BRANCH="${1:-main}"

cd "$REPO_ROOT"

echo "[deploy] Pulling latest code from origin/$BRANCH..."
git pull origin "$BRANCH"

echo "[deploy] Rebuilding Docker images..."
docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" up -d --build

echo "[deploy] Deployment finished successfully."
