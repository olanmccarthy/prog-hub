#!/bin/bash

# Deployment script for prog-hub
# This script should be run on the EC2 instance

set -e

echo "=== Prog-Hub Deployment Script ==="
echo "Starting deployment at $(date)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Are you in the project directory?"
    exit 1
fi

# Pull latest changes
echo "Pulling latest code from main branch..."
git fetch origin
git reset --hard origin/main

# Stop running containers
echo "Stopping containers..."
npm run docker:down || true

# Clean up old images (optional, uncomment if needed)
# echo "Cleaning up old Docker images..."
# docker image prune -f

# Rebuild containers
echo "Building containers..."
npm run docker:build

# Start containers
echo "Starting containers..."
npm run docker:up -d

# Wait for containers to be healthy
echo "Waiting for containers to start..."
sleep 10

# Check container status
echo "Container status:"
docker ps

echo ""
echo "=== Deployment Complete ==="
echo "Application should be running at http://$(curl -s ifconfig.me):3000"
echo ""
echo "To view logs:"
echo "  docker logs -f next_app_prod"
echo "  docker logs -f mysql_db_prod"
