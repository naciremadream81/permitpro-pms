#!/bin/bash

# Cloudflare Tunnel Management Script
# 
# This script helps manage your Cloudflare Tunnel for PermitPro PMS
# 
# Usage:
#   ./scripts/cloudflare-tunnel.sh [start|stop|restart|status|logs|install]

set -e

TUNNEL_SERVICE="cloudflared"
CONFIG_FILE="/etc/cloudflared/config.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_cloudflared() {
    if ! command -v cloudflared &> /dev/null; then
        print_error "cloudflared is not installed"
        print_info "Install it with: ./scripts/cloudflare-tunnel.sh install"
        exit 1
    fi
}

install_cloudflared() {
    print_info "Installing cloudflared..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Detect architecture
        ARCH=$(uname -m)
        if [ "$ARCH" = "x86_64" ]; then
            ARCH="amd64"
        elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            ARCH="arm64"
        fi
        
        print_info "Detected architecture: $ARCH"
        
        # Download latest release
        LATEST_VERSION=$(curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest | grep tag_name | cut -d '"' -f 4)
        DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/download/${LATEST_VERSION}/cloudflared-linux-${ARCH}.deb"
        
        print_info "Downloading cloudflared ${LATEST_VERSION}..."
        wget -O /tmp/cloudflared.deb "$DOWNLOAD_URL"
        
        print_info "Installing..."
        sudo dpkg -i /tmp/cloudflared.deb || sudo apt-get install -f -y
        rm /tmp/cloudflared.deb
        
        print_info "cloudflared installed successfully!"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install cloudflare/cloudflare/cloudflared
        else
            print_error "Homebrew is required for macOS installation"
            exit 1
        fi
    else
        print_error "Unsupported OS. Please install cloudflared manually."
        exit 1
    fi
}

start_tunnel() {
    check_cloudflared
    
    if systemctl is-active --quiet $TUNNEL_SERVICE; then
        print_warning "Tunnel is already running"
        return
    fi
    
    print_info "Starting Cloudflare Tunnel..."
    sudo systemctl start $TUNNEL_SERVICE
    
    if systemctl is-active --quiet $TUNNEL_SERVICE; then
        print_info "Tunnel started successfully"
    else
        print_error "Failed to start tunnel"
        exit 1
    fi
}

stop_tunnel() {
    if ! systemctl is-active --quiet $TUNNEL_SERVICE; then
        print_warning "Tunnel is not running"
        return
    fi
    
    print_info "Stopping Cloudflare Tunnel..."
    sudo systemctl stop $TUNNEL_SERVICE
    print_info "Tunnel stopped"
}

restart_tunnel() {
    print_info "Restarting Cloudflare Tunnel..."
    stop_tunnel
    sleep 2
    start_tunnel
}

status_tunnel() {
    check_cloudflared
    
    print_info "Cloudflare Tunnel Status:"
    echo ""
    
    if systemctl is-active --quiet $TUNNEL_SERVICE; then
        echo -e "  Status: ${GREEN}Running${NC}"
    else
        echo -e "  Status: ${RED}Stopped${NC}"
    fi
    
    if [ -f "$CONFIG_FILE" ]; then
        echo -e "  Config: ${GREEN}Found${NC} ($CONFIG_FILE)"
    else
        echo -e "  Config: ${RED}Not Found${NC}"
    fi
    
    echo ""
    systemctl status $TUNNEL_SERVICE --no-pager -l || true
}

logs_tunnel() {
    print_info "Showing Cloudflare Tunnel logs (Ctrl+C to exit)..."
    sudo journalctl -u $TUNNEL_SERVICE -f
}

# Main script logic
case "${1:-}" in
    start)
        check_root
        start_tunnel
        ;;
    stop)
        check_root
        stop_tunnel
        ;;
    restart)
        check_root
        restart_tunnel
        ;;
    status)
        status_tunnel
        ;;
    logs)
        logs_tunnel
        ;;
    install)
        install_cloudflared
        ;;
    *)
        echo "Cloudflare Tunnel Management Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start    - Start the tunnel service"
        echo "  stop     - Stop the tunnel service"
        echo "  restart  - Restart the tunnel service"
        echo "  status   - Show tunnel status"
        echo "  logs     - Show tunnel logs (follow mode)"
        echo "  install  - Install cloudflared"
        echo ""
        exit 1
        ;;
esac

