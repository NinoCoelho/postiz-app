#!/bin/bash

# Deploy Latest Postiz Image from DockerHub
# Run this script on your production server to deploy the latest version

set -e  # Exit on any error

# Configuration
DOCKERHUB_IMAGE="idemir/postiz-app:latest"
CONTAINER_NAME="postiz"
OLD_CONTAINER_NAME="${CONTAINER_NAME}-old"
PORT="4200"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Latest Postiz from DockerHub${NC}"
echo "=================================="
echo -e "${BLUE}📋 Image: ${DOCKERHUB_IMAGE}${NC}"
echo ""

# Step 1: Pull the latest image
echo -e "${YELLOW}📦 Pulling latest image from DockerHub...${NC}"
docker pull ${DOCKERHUB_IMAGE}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Image pulled successfully!${NC}"
else
    echo -e "${RED}❌ Failed to pull image!${NC}"
    exit 1
fi

# Step 2: Backup current container (if exists)
echo -e "${YELLOW}💾 Backing up current container...${NC}"
if docker ps -a | grep -q "^.*${CONTAINER_NAME}[[:space:]]"; then
    echo "Found existing container '${CONTAINER_NAME}', backing up..."
    docker stop ${CONTAINER_NAME} 2>/dev/null || true
    docker rename ${CONTAINER_NAME} ${OLD_CONTAINER_NAME} 2>/dev/null || true
    echo -e "${GREEN}✅ Container backed up as '${OLD_CONTAINER_NAME}'${NC}"
else
    echo "No existing container found."
fi

# Step 3: Deploy new container
echo -e "${YELLOW}🚀 Deploying new container...${NC}"
docker run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    -p ${PORT}:${PORT} \
    -v $(pwd)/uploads:/app/uploads \
    -e NODE_ENV=production \
    ${DOCKERHUB_IMAGE}

# Step 4: Wait for container to start
echo -e "${YELLOW}⏳ Waiting for container to start...${NC}"
sleep 10

# Step 5: Check container status
echo -e "${YELLOW}🔍 Checking container status...${NC}"
if docker ps | grep -q ${CONTAINER_NAME}; then
    echo -e "${GREEN}✅ Container is running successfully!${NC}"
    
    # Show container logs
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    docker logs ${CONTAINER_NAME} --tail 20
    
else
    echo -e "${RED}❌ Container failed to start!${NC}"
    echo -e "${YELLOW}📋 Error logs:${NC}"
    docker logs ${CONTAINER_NAME} --tail 50
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo "=================================="
echo -e "${BLUE}📋 Summary:${NC}"
echo "  - Image: ${DOCKERHUB_IMAGE}"
echo "  - Container: ${CONTAINER_NAME}"
echo "  - Port: ${PORT}"
echo "  - Status: ✅ Running"
echo ""
echo -e "${YELLOW}🔧 Useful Commands:${NC}"
echo "  - View logs: docker logs ${CONTAINER_NAME} -f"
echo "  - Restart: docker restart ${CONTAINER_NAME}"
echo "  - Stop: docker stop ${CONTAINER_NAME}"
echo "  - Rollback: docker stop ${CONTAINER_NAME} && docker start ${OLD_CONTAINER_NAME}"
echo ""
echo -e "${GREEN}🎯 Your Instagram video fix is now live!${NC}" 