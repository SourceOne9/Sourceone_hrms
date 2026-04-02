#!/bin/bash
set -e

echo "=== EMS Pro Django Backend — Railway Start ==="

echo "Running migrations on default DB..."
python manage.py migrate --database=default

# Tenant DB migration (non-fatal — DB may not exist yet)
TENANT_SLUGS="${TENANT_DB_SLUGS:-sourceoneai}"
IFS=',' read -ra SLUGS <<< "$TENANT_SLUGS"
for slug in "${SLUGS[@]}"; do
    slug=$(echo "$slug" | xargs)
    db_alias="${TENANT_DB_NAME_PREFIX:-postgres_}${slug}"
    echo "Running migrations on tenant DB: $db_alias ..."
    python manage.py migrate --database="$db_alias" || echo "WARNING: Migration failed for $db_alias (DB may not exist yet)"
done

echo "Seeding RBAC & Features..."
for slug in "${SLUGS[@]}"; do
    slug=$(echo "$slug" | xargs)
    python manage.py seed_rbac --tenant-slug "$slug" || echo "WARNING: seed_rbac failed for $slug"
done
python manage.py seed_features || echo "WARNING: seed_features failed"

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn on port ${PORT:-8001}..."
exec python -m gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8001}" \
    --workers "${GUNICORN_WORKERS:-4}" \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
