#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# db-setup.sh
# Reads credentials from .env and:
#   1. Creates the PostgreSQL user (if not exists)
#   2. Creates the database (if not exists)
#   3. Grants all privileges
#   4. Runs Prisma migrations
#   5. Generates Prisma client
# Run: npm run db:setup
# ─────────────────────────────────────────────────────────────────────────────

set -e

# ── Load .env ─────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "❌  .env file not found. Please create one first."
  exit 1
fi

export $(grep -v '^#' .env | xargs)

# ── Parse DATABASE_URL ────────────────────────────────────────────────────────
# Expected format: postgresql://USER:PASSWORD@HOST:PORT/DBNAME
DB_URL="${DATABASE_URL}"

DB_USER=$(echo "$DB_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|' | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:]+):.*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')

echo ""
echo "🔧  Database Setup"
echo "─────────────────────────────────────"
echo "  Host     : $DB_HOST:$DB_PORT"
echo "  Database : $DB_NAME"
echo "  User     : $DB_USER"
echo "─────────────────────────────────────"

# ── Step 1: Create user if not exists ─────────────────────────────────────────
echo ""
echo "👤  Step 1: Creating user '$DB_USER' (if not exists)..."
psql postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
  && echo "    ✅  User '$DB_USER' already exists. Skipping." \
  || psql postgres -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$DB_PASS';" \
  && echo "    ✅  User '$DB_USER' created."

# ── Step 2: Create database if not exists ─────────────────────────────────────
echo ""
echo "🗄️   Step 2: Creating database '$DB_NAME' (if not exists)..."
psql postgres -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  && echo "    ✅  Database '$DB_NAME' already exists. Skipping." \
  || psql postgres -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" \
  && echo "    ✅  Database '$DB_NAME' created."

# ── Step 3: Grant privileges ──────────────────────────────────────────────────
echo ""
echo "🔑  Step 3: Granting privileges to '$DB_USER'..."
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";"
psql "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO \"$DB_USER\";"
psql "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"$DB_USER\";"
psql "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"$DB_USER\";"
psql "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"$DB_USER\";"
echo "    ✅  Privileges granted."

# ── Step 4: Run Prisma migrations ─────────────────────────────────────────────
echo ""
echo "🚀  Step 4: Running Prisma migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma --config=prisma/prisma.config.ts
echo "    ✅  Migrations applied."

# ── Step 5: Generate Prisma client ────────────────────────────────────────────
echo ""
echo "⚙️   Step 5: Generating Prisma client..."
npx prisma generate
echo "    ✅  Prisma client generated."

echo ""
echo "✅  Database setup complete! You can now run: npm run start:dev"
echo ""
