#!/usr/bin/env bash
# Charge les comptes démo + les CSV fournis dans data/imports/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
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
echo "→ Données CSV (data/imports/)…"
"$PY" manage.py import_data
echo "→ OK — sites, cuves, groupes et rapports chargés."
