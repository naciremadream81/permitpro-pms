#!/bin/bash
#
# Build script for Guacamole ARM64 Docker images
# This script builds native ARM64 images from source for better performance
#

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Building Guacamole ARM64 Images${NC}"
echo -e "${BLUE}========================================${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Verify source directories exist
if [ ! -d "guacamole-server-1.6.0" ]; then
    echo -e "${YELLOW}Error: guacamole-server-1.6.0 directory not found!${NC}"
    exit 1
fi

if [ ! -d "guacamole-client-1.6.0" ]; then
    echo -e "${YELLOW}Error: guacamole-client-1.6.0 directory not found!${NC}"
    exit 1
fi

# Build guacd (guacamole-server) first
echo -e "\n${GREEN}[1/2] Building guacd (guacamole-server) for ARM64...${NC}"
cd guacamole-server-1.6.0

# Build with ARM64 architecture explicitly set
docker build \
    --platform linux/arm64 \
    --build-arg BUILD_ARCHITECTURE=ARM \
    -t guacamole/guacd:arm64-local \
    -f Dockerfile \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ guacd image built successfully!${NC}"
else
    echo -e "${YELLOW}✗ guacd build failed!${NC}"
    exit 1
fi

cd ..

# Build guacamole-client
echo -e "\n${GREEN}[2/2] Building guacamole-client for ARM64...${NC}"
cd guacamole-client-1.6.0

# Build with ARM64 platform
docker build \
    --platform linux/arm64 \
    -t guacamole/guacamole:arm64-local \
    -f Dockerfile \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ guacamole-client image built successfully!${NC}"
else
    echo -e "${YELLOW}✗ guacamole-client build failed!${NC}"
    exit 1
fi

cd ..

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\nBuilt images:"
echo -e "  - ${GREEN}guacamole/guacd:arm64-local${NC}"
echo -e "  - ${GREEN}guacamole/guacamole:arm64-local${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Update docker-compose.yml to use these images"
echo -e "2. Remove 'platform: linux/amd64' lines from docker-compose.yml"
echo -e "3. Restart Guacamole services: docker compose --profile guacamole up -d"
echo -e "\n${BLUE}Note:${NC} Building may take 30-60 minutes depending on your system."
