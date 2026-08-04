#!/bin/sh
set -eu

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

echo "→ Attente PostgreSQL (${DB_HOST}:${DB_PORT})…"
python - <<'PY'
import os, socket, time
host = os.environ.get("DB_HOST", "db")
port = int(os.environ.get("DB_PORT", "5432"))
deadline = time.time() + 60
while time.time() < deadline:
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit(f"PostgreSQL injoignable: {host}:{port}")
PY

echo "→ Migrations…"
python manage.py makemigrations --noinput
python manage.py migrate --noinput

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "→ Comptes démo…"
  python manage.py seed_accounts

  NEED_IMPORT=0
  if [ "${RUN_IMPORT_FORCE:-0}" = "1" ]; then
    NEED_IMPORT=1
  else
    COUNT="$(python - <<'PY'
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", os.environ.get("DJANGO_SETTINGS_MODULE", "core.settings.prod"))
django.setup()
from apps.sites.models import Site
print(Site.objects.count())
PY
)"
    if [ "${COUNT:-0}" = "0" ]; then
      NEED_IMPORT=1
    fi
  fi

  if [ "$NEED_IMPORT" = "1" ]; then
    echo "→ Données initiales (reset_and_import)…"
    python manage.py reset_and_import --noinput
  else
    echo "→ Données déjà présentes — import CSV ignoré (RUN_IMPORT_FORCE=1 pour forcer)."
  fi
fi

echo "→ Démarrage…"
exec "$@"
