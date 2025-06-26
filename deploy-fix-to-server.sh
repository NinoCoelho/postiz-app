#!/bin/bash

# Deploy Fixed Postiz Image to Production Server
# Run this script on your production server after transferring the image

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Fixed Postiz Image${NC}"
echo "=================================="

# Configuration
IMAGE_TAR="~/postiz-fixed.tar"
CONTAINER_NAME="postiz"
OLD_CONTAINER_NAME="${CONTAINER_NAME}-old"
IMAGE_NAME="idemir/postiz-fixed:latest"
PORT="4200"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  - Image TAR: ${IMAGE_TAR}"
echo "  - Container: ${CONTAINER_NAME}"
echo "  - Port: ${PORT}"
echo ""

# Step 1: Load the Docker image
echo -e "${YELLOW}📦 Loading Docker image...${NC}"
if [ -f ~/postiz-fixed.tar ]; then
    docker load -i ~/postiz-fixed.tar
    echo -e "${GREEN}✅ Image loaded successfully!${NC}"
else
    echo -e "${RED}❌ Image file not found: ${IMAGE_TAR}${NC}"
    echo "Please ensure the image was transferred correctly."
    exit 1
fi

# Step 2: Backup current container (if exists)
echo -e "${YELLOW}💾 Backing up current container...${NC}"
if docker ps -a | grep -q "^.*${CONTAINER_NAME}[[:space:]]"; then
    echo "Found existing container '${CONTAINER_NAME}', renaming to '${OLD_CONTAINER_NAME}'"
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
    ${IMAGE_NAME}

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

# Step 6: Test the application
echo -e "${YELLOW}🧪 Testing application...${NC}"
sleep 5
if curl -f -s "http://localhost:${PORT}" > /dev/null; then
    echo -e "${GREEN}✅ Application is responding!${NC}"
else
    echo -e "${YELLOW}⚠️ Application may still be starting up...${NC}"
    echo "Check logs with: docker logs ${CONTAINER_NAME} -f"
fi

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo "=================================="
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "  - Test your Instagram video uploads"
echo "  - Check logs: docker logs ${CONTAINER_NAME} -f"
echo "  - If all good, remove old container: docker rm ${OLD_CONTAINER_NAME}"
echo "  - Clean up image file: rm ~/postiz-fixed.tar"
echo ""
echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
echo "  - Rollback: docker stop ${CONTAINER_NAME} && docker start ${OLD_CONTAINER_NAME}"
echo "  - View logs: docker logs ${CONTAINER_NAME} -f"
echo "  - Container status: docker ps -a"
echo ""
echo -e "${GREEN}🎯 The video validation fix is now deployed!${NC}"
echo "Your Instagram posts should now work with videos from services.jornada.me" 