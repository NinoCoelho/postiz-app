#!/bin/bash

# Simple Build and Push to DockerHub (amd64 only)
# This script builds a single-platform Docker image and pushes it directly to DockerHub

set -e  # Exit on any error

# Configuration - UPDATE THESE VALUES
DOCKERHUB_USERNAME="idemir"  # ⚠️ ALTERE PARA SEU USERNAME DO DOCKERHUB
IMAGE_NAME="postiz-app"       # Nome da imagem no DockerHub
VERSION_TAG="nolimit"          # Tag da versão (pode ser latest, v1.0.0, etc.)

# Derived values
FULL_IMAGE_TAG="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${VERSION_TAG}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Build and Push to DockerHub (amd64 only)${NC}"
echo "=================================="
echo -e "${BLUE}📋 Building: ${FULL_IMAGE_TAG}${NC}"
echo ""

# Step 1: Build and push directly to DockerHub
echo -e "${YELLOW}🔨 Building and pushing Docker image for amd64...${NC}"
docker build \
    --platform linux/amd64 \
    --tag ${FULL_IMAGE_TAG} \
    --file Dockerfile.dev \
    --push \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build and push completed successfully!${NC}"
else
    echo -e "${RED}❌ Build/push failed!${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Success! Image pushed to DockerHub${NC}"
echo "=================================="
echo -e "${BLUE}📋 Summary:${NC}"
echo "  - Image: ${FULL_IMAGE_TAG}"
echo "  - Platform: linux/amd64"
echo "  - DockerHub: https://hub.docker.com/r/${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
echo ""
echo -e "${YELLOW}💡 To pull and run on your server:${NC}"
echo "  docker pull ${FULL_IMAGE_TAG}"
echo "  docker run -d --name postiz -p 4200:4200 ${FULL_IMAGE_TAG}"
echo ""
echo -e "${GREEN}🚀 Ready for production deployment!${NC}" 