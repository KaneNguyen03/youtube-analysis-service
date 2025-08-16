#!/bin/bash

echo "🐳 YouTube Analysis Service - Docker Alternative Launcher"
echo "========================================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Build the image
echo "🔨 Building Docker image..."
docker build -t youtube-analysis-service .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed."
    exit 1
fi

# Stop any existing container
echo "🛑 Stopping existing containers..."
docker stop youtube-analysis 2>/dev/null || true
docker rm youtube-analysis 2>/dev/null || true

# Run the container with proper volume mounting for WSL
echo "🚀 Starting YouTube Analysis Service..."
docker run -d \
  --name youtube-analysis \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e GPTZERO_API_KEY="${GPTZERO_API_KEY:-}" \
  -e ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-}" \
  youtube-analysis-service

if [ $? -eq 0 ]; then
    echo "✅ Service started successfully!"
    echo "🌐 Web interface: http://localhost:8080"
    echo "📡 API endpoint: http://localhost:8080/analyze"
    echo ""
    echo "📋 Service status:"
    sleep 3
    docker ps | grep youtube-analysis
    echo ""
    echo "📊 To check logs: docker logs youtube-analysis -f"
    echo "🛑 To stop: docker stop youtube-analysis"
else
    echo "❌ Failed to start service"
    exit 1
fi
