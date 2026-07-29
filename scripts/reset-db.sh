#!/usr/bin/env bash
# Reset des données métier (+ optionnel réimport).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"

cd "$BACKEND"
# shellcheck disable=SC1091
source venv/bin/activate 2>/dev/null || true

case "${1:-}" in
  --import|"")
    python manage.py reset_and_import --noinput
    ;;
  --reset-only)
    python manage.py reset_data --noinput
    ;;
  *)
    echo "Usage: $0 [--import|--reset-only]"
    echo "  --import       reset + import_data (défaut)"
    echo "  --reset-only   reset uniquement"
    exit 1
    ;;
esac
