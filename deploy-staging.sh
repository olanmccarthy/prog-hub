#!/bin/bash

# Deployment script for prog-hub STAGING environment
# This script should be run on the EC2 instance

set -e

echo "=== Prog-Hub STAGING Deployment Script ==="
echo "Starting deployment at $(date)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Are you in the project directory?"
    exit 1
fi

# Pull latest changes from main branch (or specify a different branch)
echo "Pulling latest code from main branch..."
git fetch origin
git reset --hard origin/main

# Stop running staging containers ONLY
echo "Stopping staging containers..."
docker stop next_app_staging mysql_db_staging 2>/dev/null || true
docker rm next_app_staging mysql_db_staging 2>/dev/null || true

# Clean up old images (optional, uncomment if needed)
# echo "Cleaning up old Docker images..."
# docker image prune -f

# Rebuild staging containers with Docker Buildkit disabled
echo "Building staging containers..."
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0
docker-compose -f docker-compose.staging.yml build --no-cache

# Start staging containers
echo "Starting staging containers..."
docker-compose -f docker-compose.staging.yml up -d

# Wait for containers to be healthy
echo "Waiting for containers to start..."
sleep 10

# Check container status
echo "Container status:"
docker ps | grep staging

echo ""
echo "=== Staging Deployment Complete ==="
echo "Staging application should be running at http://localhost:3001"
echo "Public URL: https://staging.olanfans.com"
echo ""
echo "To view logs:"
echo "  docker logs -f next_app_staging"
echo "  docker logs -f mysql_db_staging"
echo ""
