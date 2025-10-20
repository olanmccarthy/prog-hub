#!/bin/bash

# Script to generate SQL dump of the sets table
# Usage: ./generate_sets.sh [dev|prod]
# Default: dev

set -e  # Exit on error

# Determine environment (default to dev)
ENV="${1:-dev}"

if [ "$ENV" = "prod" ]; then
    CONTAINER="mysql_db_prod"
    ENV_FILE=".env.production"
    echo "Using production database container..."
elif [ "$ENV" = "dev" ]; then
    CONTAINER="mysql_db_dev"
    ENV_FILE=".env"
    echo "Using development database container..."
else
    echo "Error: Invalid environment. Use 'dev' or 'prod'"
    echo "Usage: ./generate_sets.sh [dev|prod]"
    exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "Error: Container '${CONTAINER}' is not running"
    echo "Start it with: npm run docker:${ENV}:up"
    exit 1
fi

# Load environment variables from appropriate .env file
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    exit 1
fi

# Source the .env file and extract credentials
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

# Database credentials (from .env files)
DB_USER="${DB_USER:-appuser}"
DB_PASSWORD="${DB_PASSWORD:-apppass}"
DB_NAME="${DB_NAME:-appdb}"
OUTPUT_FILE="data/new_sets.sql"

echo "Generating SQL dump of sets table..."

# Use mysqldump to export the sets table
# --add-drop-table: Add DROP TABLE IF EXISTS before CREATE TABLE
# --complete-insert: Use complete INSERT statements with column names
# --skip-extended-insert: One INSERT per row (more readable)
docker exec "$CONTAINER" mysqldump \
    -u"$DB_USER" \
    -p"$DB_PASSWORD" \
    --add-drop-table \
    --complete-insert \
    --skip-extended-insert \
    "$DB_NAME" \
    sets > "$OUTPUT_FILE"

# Check if file was created successfully
if [ -f "$OUTPUT_FILE" ]; then
    LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
    echo "✓ Successfully generated $OUTPUT_FILE"
    echo "✓ File contains $LINE_COUNT lines"
    echo ""
    echo "Preview (first 10 lines):"
    head -10 "$OUTPUT_FILE"
else
    echo "✗ Error: Failed to generate SQL file"
    exit 1
fi
