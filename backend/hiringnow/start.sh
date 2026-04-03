#!/bin/bash
set -e

echo "=== SourceOne Hr Django Backend — Railway Start ==="

echo "Checking custom user table state on default DB..."
python - <<'PY'
import os
import psycopg2

conn = psycopg2.connect(
    dbname=os.environ["DB_NAME"],
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
    host=os.environ["DB_HOST"],
    port=os.environ.get("DB_PORT", "5432"),
)
conn.autocommit = True

with conn.cursor() as cur:
    # Check if django_migrations table exists (fresh DB won't have it)
    cur.execute("SELECT to_regclass('public.django_migrations')")
    migrations_table = cur.fetchone()[0]

    if migrations_table is None:
        print("Fresh database — django_migrations does not exist yet. Skipping pre-check.")
    else:
        cur.execute("SELECT to_regclass('public.users')")
        users_table = cur.fetchone()[0]

        if users_table is None:
            print("users table is missing; resetting users migration history on default DB...")
            cur.execute("DELETE FROM django_migrations WHERE app IN ('users', 'user_sessions')")
        else:
            print("users table exists; keeping users migration history intact.")

conn.close()
PY

echo "Priming custom user model migrations on default DB..."
python manage.py migrate users --database=default

echo "Running migrations on default DB..."
python manage.py migrate --database=default

if [ "${BOOTSTRAP_TENANTS_ON_START:-false}" = "true" ]; then
    echo "BOOTSTRAP_TENANTS_ON_START=true — running tenant bootstrap tasks..."

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
else
    echo "Skipping tenant bootstrap tasks on startup. Set BOOTSTRAP_TENANTS_ON_START=true to enable them."
fi

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn on port ${PORT:-8001}..."
exec python -m gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8001}" \
    --workers "${GUNICORN_WORKERS:-4}" \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
