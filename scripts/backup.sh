#!/usr/bin/env bash
# CarburFlow - Backup Script
# Effectue un dump de la base de données PostgreSQL et le transfère vers le serveur de fichiers.

set -euo pipefail

# --- Configuration ---
# Ces variables peuvent être définies dans le fichier .env
DB_CONTAINER="db"
DB_USER="${DB_USER:-carburflow}"
DB_NAME="${DB_NAME:-carburflow}"
LOCAL_BACKUP_DIR="/tmp/carburflow_backups"
REMOTE_BACKUP_DIR="${REMOTE_BACKUP_DIR:-/mnt/camtel_backups/carburflow}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

# Création du dossier local temporaire
mkdir -p "$LOCAL_BACKUP_DIR"

echo "[$(date)] Démarrage de la sauvegarde de la base $DB_NAME..."

# 1. Exécution du dump compressé depuis le conteneur
# On utilise pg_dump et on compresse à la volée avec gzip
if docker compose exec -T "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$LOCAL_BACKUP_DIR/$FILENAME"; then
    echo "✅ Sauvegarde locale réussie : $FILENAME"
else
    echo "❌ Erreur lors du dump de la base de données"
    exit 1
fi

# 2. Transfert vers le serveur de fichiers CAMTEL
# On vérifie si le dossier distant est accessible (via montage NFS/Samba ou scp)
if [[ -d "$REMOTE_BACKUP_DIR" ]]; then
    echo "→ Transfert vers le serveur de fichiers : $REMOTE_BACKUP_DIR"
    mv "$LOCAL_BACKUP_DIR/$FILENAME" "$REMOTE_BACKUP_DIR/"
    echo "✅ Transfert terminé avec succès."
else
    echo "⚠ Le serveur de fichiers n'est pas accessible en tant que répertoire."
    echo "Tente un transfert via scp (si configuré)..."
    # Note : Le transfert scp nécessiterait des clés SSH configurées.
    # Si le montage réseau est préféré, l'erreur s'arrêtera ici.
    # Pour l'instant, on garde le fichier localement pour éviter la perte.
    echo "❌ Échec du transfert distant. Le backup reste dans $LOCAL_BACKUP_DIR"
fi

# 3. Nettoyage des anciens backups locaux (plus de 24h)
find "$LOCAL_BACKUP_DIR" -name "backup_*.sql.gz" -mtime +1 -delete

echo "[$(date)] Fin du processus de sauvegarde."
