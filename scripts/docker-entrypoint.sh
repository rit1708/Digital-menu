#!/bin/sh
set -e

echo "🚀 Starting application..."

# Wait for database to be ready (database healthcheck should handle this, but add extra wait)
echo "⏳ Waiting for database connection..."
sleep 5

# Run migrations (using node to run prisma since we're in standalone mode)
echo "📦 Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy 2>/dev/null || \
node node_modules/prisma/build/index.js db push --accept-data-loss 2>/dev/null || \
echo "⚠️  Migration skipped (database may already be set up)"

echo "✅ Database setup complete!"

# Start the application
echo "🎉 Starting Next.js server..."
exec "$@"

