#!/bin/bash
# ============================================================================
# ReactBits MCP Server Installation Script
# One-click installation for various platforms and methods
# ============================================================================

set -euo pipefail

# Configuration
PACKAGE_NAME="reactbits-mcp-server"
DOCKER_IMAGE="reactbits/mcp-server"
GITHUB_REPO="DavidHDev/react-bits"
MIN_NODE_VERSION="18.0.0"
INSTALL_METHOD=""
INSTALL_DIR="/opt/reactbits-mcp"
SERVICE_USER="reactbits-mcp"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
handle_error() {
    local exit_code=$?
    log_error "Installation failed with exit code $exit_code"
    log_info "Please check the error messages above and try again"
    exit $exit_code
}

trap handle_error ERR

# Help function
show_help() {
    echo "ReactBits MCP Server Installation Script"
    echo ""
    echo "Usage: $0 [METHOD] [OPTIONS]"
    echo ""
    echo "Installation Methods:"
    echo "  npm         Install via NPM package manager (default)"
    echo "  docker      Install via Docker"
    echo "  source      Install from source code"
    echo "  auto        Auto-detect best installation method"
    echo ""
    echo "Options:"
    echo "  --global    Install globally (NPM only)"
    echo "  --local     Install locally in current directory"
    echo "  --service   Install as system service (Linux only)"
    echo "  --dev       Install development dependencies"
    echo "  --version   Install specific version"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 npm --global"
    echo "  $0 docker"
    echo "  $0 source --dev"
    echo "  $0 auto --service"
    echo ""
    echo "Environment Variables:"
    echo "  NODE_VERSION - Override Node.js version check"
    echo "  INSTALL_DIR  - Override installation directory"
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Version comparison function
version_ge() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Check prerequisites
check_prerequisites() {
    local os=$(detect_os)
    log_info "Detected OS: $os"
    
    # Check Node.js (for npm and source installations)
    if [[ $INSTALL_METHOD != "docker" ]]; then
        if ! command_exists node; then
            log_error "Node.js is required but not installed"
            log_info "Please install Node.js from https://nodejs.org/"
            exit 1
        fi
        
        local node_version=$(node --version | sed 's/v//')
        if ! version_ge "$node_version" "$MIN_NODE_VERSION"; then
            log_error "Node.js version $node_version is not supported"
            log_error "Minimum required version: $MIN_NODE_VERSION"
            exit 1
        fi
        
        log_success "Node.js $node_version is compatible"
    fi
    
    # Check npm (for npm installation)
    if [[ $INSTALL_METHOD == "npm" ]]; then
        if ! command_exists npm; then
            log_error "npm is required but not installed"
            exit 1
        fi
        log_success "npm $(npm --version) found"
    fi
    
    # Check Docker (for docker installation)
    if [[ $INSTALL_METHOD == "docker" ]]; then
        if ! command_exists docker; then
            log_error "Docker is required but not installed"
            log_info "Please install Docker from https://docs.docker.com/get-docker/"
            exit 1
        fi
        log_success "Docker $(docker --version | cut -d' ' -f3 | sed 's/,//') found"
    fi
    
    # Check git (for source installation)
    if [[ $INSTALL_METHOD == "source" ]]; then
        if ! command_exists git; then
            log_error "Git is required for source installation"
            exit 1
        fi
        log_success "Git $(git --version | cut -d' ' -f3) found"
    fi
}

# Auto-detect best installation method
auto_detect_method() {
    log_info "Auto-detecting best installation method..."
    
    if command_exists docker; then
        INSTALL_METHOD="docker"
        log_info "Selected Docker installation (recommended)"
    elif command_exists npm; then
        INSTALL_METHOD="npm"
        log_info "Selected NPM installation"
    elif command_exists git && command_exists node; then
        INSTALL_METHOD="source"
        log_info "Selected source installation"
    else
        log_error "No suitable installation method found"
        log_info "Please install Docker, Node.js+npm, or Git+Node.js"
        exit 1
    fi
}

# Install via NPM
install_npm() {
    log_info "Installing via NPM..."
    
    local npm_args=""
    if [[ "${GLOBAL:-false}" == "true" ]]; then
        npm_args="-g"
        log_info "Installing globally..."
    else
        log_info "Installing locally..."
    fi
    
    if [[ -n "${VERSION:-}" ]]; then
        npm_args="$npm_args $PACKAGE_NAME@$VERSION"
    else
        npm_args="$npm_args $PACKAGE_NAME"
    fi
    
    # Install package
    npm install $npm_args
    
    # Verify installation
    if [[ "${GLOBAL:-false}" == "true" ]]; then
        if ! command_exists reactbits-mcp-server; then
            log_error "Global installation failed - command not found"
            exit 1
        fi
        log_success "Package installed globally"
        log_info "You can now run: reactbits-mcp-server"
    else
        if [[ ! -d "node_modules/$PACKAGE_NAME" ]]; then
            log_error "Local installation failed - package not found"
            exit 1
        fi
        log_success "Package installed locally"
        log_info "You can run: npx reactbits-mcp-server"
    fi
}

# Install via Docker
install_docker() {
    log_info "Installing via Docker..."
    
    local image_tag="${VERSION:-latest}"
    local full_image="$DOCKER_IMAGE:$image_tag"
    
    # Pull Docker image
    log_info "Pulling Docker image: $full_image"
    docker pull "$full_image"
    
    # Create data directories
    log_info "Creating data directories..."
    mkdir -p data/{cache,logs}
    
    # Create docker-compose.yml if it doesn't exist
    if [[ ! -f "docker-compose.yml" ]]; then
        log_info "Creating docker-compose.yml..."
        cat > docker-compose.yml << EOF
version: '3.8'

services:
  mcp-server:
    image: $full_image
    container_name: reactbits-mcp-server
    restart: unless-stopped
    
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    
    volumes:
      - ./data/cache:/app/scraper-cache
      - ./data/logs:/app/logs
    
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Health check passed')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
EOF
    fi
    
    log_success "Docker installation completed"
    log_info "To start the server, run: docker-compose up -d"
    log_info "To view logs, run: docker-compose logs -f"
}

# Install from source
install_source() {
    log_info "Installing from source..."
    
    local repo_url="https://github.com/$GITHUB_REPO.git"
    local clone_dir="react-bits"
    
    # Clone repository
    if [[ ! -d "$clone_dir" ]]; then
        log_info "Cloning repository..."
        git clone "$repo_url" "$clone_dir"
    else
        log_info "Repository already exists, pulling latest changes..."
        cd "$clone_dir"
        git pull origin main
        cd ..
    fi
    
    cd "$clone_dir/mcp-server" || cd "$clone_dir"
    
    # Install dependencies
    log_info "Installing dependencies..."
    if [[ "${DEV:-false}" == "true" ]]; then
        npm install
    else
        npm ci --only=production
    fi
    
    # Build if TypeScript files exist
    if [[ -f "tsconfig.json" ]]; then
        log_info "Building TypeScript..."
        npm run build
    fi
    
    # Make executable if needed
    if [[ -f "dist/index.js" ]]; then
        chmod +x dist/index.js
    fi
    
    log_success "Source installation completed"
    log_info "To start the server, run: npm start"
    log_info "For development, run: npm run dev"
}

# Install as system service (Linux only)
install_service() {
    local os=$(detect_os)
    if [[ "$os" != "linux" ]]; then
        log_warning "System service installation is only supported on Linux"
        return
    fi
    
    if [[ $EUID -ne 0 ]]; then
        log_error "Service installation requires root privileges"
        log_info "Please run with sudo"
        exit 1
    fi
    
    log_info "Installing as system service..."
    
    # Create service user
    if ! id "$SERVICE_USER" &>/dev/null; then
        log_info "Creating service user: $SERVICE_USER"
        useradd -r -s /bin/false "$SERVICE_USER"
    fi
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    
    # Install package globally
    npm install -g "$PACKAGE_NAME"
    
    # Create systemd service file
    log_info "Creating systemd service..."
    cat > /etc/systemd/system/reactbits-mcp.service << EOF
[Unit]
Description=ReactBits MCP Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
ExecStart=$(which reactbits-mcp-server)
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Enable and start service
    systemctl daemon-reload
    systemctl enable reactbits-mcp
    systemctl start reactbits-mcp
    
    log_success "Service installed and started"
    log_info "Service status: systemctl status reactbits-mcp"
    log_info "View logs: journalctl -u reactbits-mcp -f"
}

# Post-installation steps
post_install() {
    log_info "Running post-installation steps..."
    
    # Create MCP configuration example
    cat > mcp-config-example.json << EOF
{
  "mcpServers": {
    "reactbits": {
      "command": "reactbits-mcp-server",
      "args": []
    }
  }
}
EOF
    
    log_success "Created MCP configuration example: mcp-config-example.json"
    
    # Show next steps
    echo ""
    log_info "Installation completed successfully!"
    echo ""
    log_info "Next steps:"
    
    case $INSTALL_METHOD in
        npm)
            if [[ "${GLOBAL:-false}" == "true" ]]; then
                echo "  1. Run the server: reactbits-mcp-server"
            else
                echo "  1. Run the server: npx reactbits-mcp-server"
            fi
            ;;
        docker)
            echo "  1. Start the server: docker-compose up -d"
            echo "  2. Check logs: docker-compose logs -f"
            ;;
        source)
            echo "  1. Navigate to the project directory"
            echo "  2. Start the server: npm start"
            ;;
    esac
    
    echo "  3. Add to Claude Desktop MCP config using mcp-config-example.json"
    echo "  4. Test the installation with a health check"
    echo ""
    log_info "For help and documentation, visit: https://github.com/$GITHUB_REPO"
}

# Parse command line arguments
GLOBAL=false
LOCAL=false
SERVICE=false
DEV=false
VERSION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        npm|docker|source|auto)
            INSTALL_METHOD="$1"
            shift
            ;;
        --global)
            GLOBAL=true
            shift
            ;;
        --local)
            LOCAL=true
            shift
            ;;
        --service)
            SERVICE=true
            shift
            ;;
        --dev)
            DEV=true
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main installation function
main() {
    log_info "ReactBits MCP Server Installation"
    echo ""
    
    # Auto-detect method if not specified
    if [[ -z "$INSTALL_METHOD" ]]; then
        INSTALL_METHOD="auto"
    fi
    
    if [[ "$INSTALL_METHOD" == "auto" ]]; then
        auto_detect_method
    fi
    
    log_info "Installation method: $INSTALL_METHOD"
    if [[ -n "$VERSION" ]]; then
        log_info "Version: $VERSION"
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Perform installation
    case $INSTALL_METHOD in
        npm)
            install_npm
            ;;
        docker)
            install_docker
            ;;
        source)
            install_source
            ;;
        *)
            log_error "Unknown installation method: $INSTALL_METHOD"
            exit 1
            ;;
    esac
    
    # Install as service if requested
    if [[ "$SERVICE" == "true" ]]; then
        install_service
    fi
    
    # Post-installation steps
    post_install
}

# Run main function
main "$@"