#!/usr/bin/env bash
# Déploiement serveur : pull des images GHCR + up.
# Usage :
#   ./scripts/deploy.sh                  # tag latest
#   ./scripts/deploy.sh v1.2.0
#   IMAGE_TAG=sha-abc1234 ./scripts/deploy.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$REPO_ROOT}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/docker/docker-compose.prod.yml}"
IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
OWNER_LC="$(echo "${GITHUB_REPOSITORY_OWNER:-nkoumougrinnel}" | tr '[:upper:]' '[:lower:]')"
BACKEND_IMAGE="${CARBURFLOW_BACKEND_IMAGE:-ghcr.io/${OWNER_LC}/carburflow-backend:${IMAGE_TAG}}"
FRONTEND_IMAGE="${CARBURFLOW_FRONTEND_IMAGE:-ghcr.io/${OWNER_LC}/carburflow-frontend:${IMAGE_TAG}}"

cd "$DEPLOY_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose introuvable : $COMPOSE_FILE" >&2
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export CARBURFLOW_BACKEND_IMAGE="$BACKEND_IMAGE"
export CARBURFLOW_FRONTEND_IMAGE="$FRONTEND_IMAGE"
export IMAGE_TAG

echo "[deploy] backend=$CARBURFLOW_BACKEND_IMAGE"
echo "[deploy] frontend=$CARBURFLOW_FRONTEND_IMAGE"

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "[deploy] OK"
