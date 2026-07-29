#!/usr/bin/env bash
# Démarre l'API Django CarburFlow (app sites) sur le port 8001.
set -euo pipefail
BACKEND="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$BACKEND/.." && pwd)"
cd "$BACKEND"

if [[ -x "$ROOT/venv/bin/python" ]] && "$ROOT/venv/bin/python" -c "import django" 2>/dev/null; then
  PY="$ROOT/venv/bin/python"
elif /usr/bin/python3 -c "import django" 2>/dev/null; then
  PY="/usr/bin/python3"
else
  PY="python3"
fi

echo "→ Migrations…"
"$PY" manage.py migrate --noinput
echo "→ Comptes démo…"
"$PY" manage.py seed_accounts
echo "→ API sur http://127.0.0.1:8001/api/v1/"
echo "→ Docs : http://127.0.0.1:8001/api/v1/docs/"
exec "$PY" manage.py runserver 8001
