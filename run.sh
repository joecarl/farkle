#!/bin/bash

cd "$(dirname "$0")"

# Create data directory if it doesn't exist
if [ ! -d "docker/data" ]; then
    echo "Creating docker/data directory..."
    mkdir -p "docker/data"
fi

# Navigate to docker directory
cd docker

# Stop existing containers
echo "Stopping existing containers..."
docker compose down

# Start containers
echo "Starting containers..."
docker compose up --build -d

echo "Application started!"
