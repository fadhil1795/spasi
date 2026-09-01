#!/bin/sh
set -e

# Sync database schema if DATABASE_URL is provided
if [ "${AUTO_DB_PUSH:-true}" = "true" ] && [ -n "$DATABASE_URL" ]; then
  echo "🚀 [Dokploy] Running 'prisma db push' to ensure database tables exist..."
  npx prisma db push --skip-generate || echo "⚠️ Warning: prisma db push failed or database is not reachable yet, continuing..."
fi

# Optional seed if SEED_DB=true
if [ "${SEED_DB:-false}" = "true" ] && [ -n "$DATABASE_URL" ]; then
  echo "🌱 [Dokploy] Running database seed..."
  npx prisma db seed || echo "⚠️ Warning: prisma db seed failed or already seeded..."
fi

# Start the main Next.js application
exec "$@"
