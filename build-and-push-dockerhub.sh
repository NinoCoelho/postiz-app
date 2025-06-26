#!/bin/bash

# Build and Push Postiz Docker Image to DockerHub
# This script builds a Docker image and pushes it to DockerHub

set -e  # Exit on any error

# Configuration - UPDATE THESE VALUES
DOCKERHUB_USERNAME="idemir"  # ⚠️ ALTERE PARA SEU USERNAME DO DOCKERHUB
IMAGE_NAME="postiz-app"       # Nome da imagem no DockerHub
VERSION_TAG="latest"          # Tag da versão (pode ser latest, v1.0.0, etc.)
BUILD_PLATFORMS="linux/amd64" # ,linux/arm64"  # Plataformas suportadas

# Derived values
FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
FULL_IMAGE_TAG="${FULL_IMAGE_NAME}:${VERSION_TAG}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Starting Postiz Docker Build and Push to DockerHub${NC}"
echo "=================================="
echo -e "${BLUE}📋 Configuration:${NC}"
echo "  - DockerHub Username: ${DOCKERHUB_USERNAME}"
echo "  - Image Name: ${IMAGE_NAME}"
echo "  - Full Image Tag: ${FULL_IMAGE_TAG}"
echo "  - Platforms: ${BUILD_PLATFORMS}"
echo ""

# Step 1: Check if logged in to DockerHub
echo -e "${YELLOW}🔐 Checking DockerHub authentication...${NC}"
if ! docker info | grep -q "Username:"; then
    echo -e "${YELLOW}⚠️  You need to login to DockerHub first${NC}"
    echo -e "${BLUE}Run: docker login${NC}"
    read -p "Press Enter after logging in, or Ctrl+C to cancel..."
fi

# Step 2: Clean up previous builds
echo -e "${YELLOW}🧹 Cleaning up previous builds...${NC}"
docker rmi ${FULL_IMAGE_TAG} 2>/dev/null || true
docker rmi ${IMAGE_NAME} 2>/dev/null || true

# Step 3: Build Docker image for multiple platforms
echo -e "${YELLOW}🔨 Building Docker image for multiple platforms...${NC}"
echo "Building: ${FULL_IMAGE_TAG}"

# Create and use a new builder instance for multi-platform builds
docker buildx create --name postiz-builder --use 2>/dev/null || docker buildx use postiz-builder

docker buildx build \
    --platform ${BUILD_PLATFORMS} \
    --tag ${FULL_IMAGE_TAG} \
    --file Dockerfile.dev \
    --push \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker build and push completed successfully!${NC}"
else
    echo -e "${RED}❌ Docker build/push failed!${NC}"
    exit 1
fi

# Step 4: Clean up builder
echo -e "${YELLOW}🧹 Cleaning up builder...${NC}"
docker buildx rm postiz-builder 2>/dev/null || true

echo -e "${GREEN}🎉 Multi-platform build and push completed successfully!${NC}"
echo "=================================="
echo -e "${BLUE}📋 Summary:${NC}"
echo "  - Image pushed to: ${FULL_IMAGE_TAG}"
echo "  - Platforms: ${BUILD_PLATFORMS}"
echo ""
echo -e "${YELLOW}💡 To pull and run on your server:${NC}"
echo "  docker pull ${FULL_IMAGE_TAG}"
echo "  docker run -d --name postiz -p 4200:4200 ${FULL_IMAGE_TAG}"
echo ""
echo -e "${BLUE}🌐 DockerHub URL:${NC}"
echo "  https://hub.docker.com/r/${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
echo ""
echo -e "${GREEN}🚀 Ready for production deployment!${NC}" 