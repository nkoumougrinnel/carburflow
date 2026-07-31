#!/usr/bin/env bash
# Expose CarburFlow via ngrok (un seul tunnel).
#
# === Docker (recommandé) ===
#   1) docker compose -f docker/docker-compose.yml up --build
#   2) ./scripts/start-ngrok.sh
#      ou : ngrok http 5174
#   Le conteneur frontend (nginx) sert le SPA et proxy /api → backend.
#
# === Sans Docker (Vite) ===
#   1) ./scripts/start-api.sh
#   2) ./scripts/start-frontend.sh tunnel
#   3) ./scripts/start-ngrok.sh
#
# Variables :
#   FRONT_PORT=5174   port local à exposer (défaut)
#   NGROK_DOMAIN=...  domaine réservé ngrok (optionnel)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONT_PORT="${FRONT_PORT:-5174}"
API_PORT="${API_PORT:-8001}"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok introuvable. Installe-le : https://ngrok.com/download"
  exit 1
fi

if ! ss -tln | grep -q ":${FRONT_PORT}"; then
  echo "⚠ Rien n’écoute sur :${FRONT_PORT}"
  echo "  Docker :  docker compose -f docker/docker-compose.yml up --build"
  echo "  Local  :  $ROOT/scripts/start-frontend.sh tunnel"
  exit 1
fi

# Heuristique Docker vs Vite : API exposée sur 8001 = stack habituelle
if ss -tln | grep -q ":${API_PORT}"; then
  echo "→ API détectée sur :${API_PORT}"
else
  echo "⚠ API absente sur :${API_PORT} (ok si vous ne tunnelisez que le front Docker avec proxy /api)"
fi

# Sans VITE_TUNNEL=1 en mode Vite, HMR casse derrière ngrok HTTPS
if pgrep -af "[n]ode.*vite|[v]ite" >/dev/null 2>&1; then
  if ! pgrep -af "VITE_TUNNEL=1|dev:tunnel" >/dev/null 2>&1; then
    echo "⚠ Frontend Vite : lancez en mode tunnel :"
    echo "    $ROOT/scripts/start-frontend.sh tunnel"
    echo ""
  fi
fi

NGROK_ARGS=(http "http://127.0.0.1:${FRONT_PORT}" --host-header=rewrite --log=stdout)
if [[ -n "${NGROK_DOMAIN:-}" ]]; then
  NGROK_ARGS+=(--domain="${NGROK_DOMAIN}")
fi

echo "→ Tunnel ngrok → http://127.0.0.1:${FRONT_PORT}"
echo "  Dashboard ngrok local : http://127.0.0.1:4040"
echo ""
echo "  Ouvrez l’URL https://….ngrok-free.app affichée ci-dessous."
echo "  Plan gratuit : cliquez une fois sur « Visit Site » (page d’avertissement)."
echo "  L’API passe par le même hôte (/api/v1) — pas besoin d’un 2ᵉ tunnel."
echo ""
exec ngrok "${NGROK_ARGS[@]}"
