#!/bin/bash
# ============================================================================
# ReactBits MCP Server Deployment Script
# Comprehensive deployment automation with health checks and rollback support
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_MODE="${1:-production}"
SERVICE_NAME="reactbits-mcp-server"
HEALTH_CHECK_URL="http://localhost:3000/health"
MAX_RETRIES=30
RETRY_INTERVAL=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        log_info "Running cleanup and rollback procedures..."
        rollback_deployment
    fi
    exit $exit_code
}

trap cleanup EXIT

# Help function
show_help() {
    echo "ReactBits MCP Server Deployment Script"
    echo ""
    echo "Usage: $0 [MODE] [OPTIONS]"
    echo ""
    echo "Modes:"
    echo "  production    Deploy to production environment (default)"
    echo "  development   Deploy development environment"
    echo "  testing       Deploy testing environment"
    echo "  docker        Deploy using Docker"
    echo "  npm          Deploy using NPM package"
    echo ""
    echo "Options:"
    echo "  --build-only  Only build, don't deploy"
    echo "  --no-health   Skip health checks"
    echo "  --force       Force deployment without confirmation"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 production"
    echo "  $0 docker --no-health"
    echo "  $0 development --build-only"
}

# Parse command line arguments
BUILD_ONLY=false
NO_HEALTH=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --no-health)
            NO_HEALTH=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        production|development|testing|docker|npm)
            DEPLOYMENT_MODE="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verify prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    
    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -V -C; then
        log_error "Node.js version $node_version is not supported. Requires >= $required_version"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is required but not installed"
        exit 1
    fi
    
    # Check Docker (if needed)
    if [[ $DEPLOYMENT_MODE == "docker" ]] && ! command -v docker &> /dev/null; then
        log_error "Docker is required for docker deployment but not installed"
        exit 1
    fi
    
    # Check Docker Compose (if needed)
    if [[ $DEPLOYMENT_MODE == "docker" ]] && ! command -v docker-compose &> /dev/null; then
        log_warning "docker-compose not found, trying docker compose plugin..."
        if ! docker compose version &> /dev/null; then
            log_error "Neither docker-compose nor docker compose plugin found"
            exit 1
        fi
        alias docker-compose='docker compose'
    fi
    
    log_success "All prerequisites satisfied"
}

# Build the application
build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_DIR"
    
    # Clean previous build
    log_info "Cleaning previous build..."
    npm run clean || true
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --no-optional --no-fund --no-audit
    
    # Type checking
    log_info "Running type checks..."
    npm run typecheck
    
    # Build application
    log_info "Building TypeScript..."
    npm run build
    
    # Verify build output
    if [[ ! -f "dist/index.js" ]]; then
        log_error "Build failed: dist/index.js not found"
        exit 1
    fi
    
    log_success "Application built successfully"
}

# Run tests
run_tests() {
    log_info "Running test suite..."
    
    cd "$PROJECT_DIR"
    
    # Run tests
    npm run test:ci
    
    log_success "All tests passed"
}

# Deploy using Docker
deploy_docker() {
    log_info "Deploying with Docker..."
    
    cd "$PROJECT_DIR"
    
    # Determine compose file
    local compose_file="docker-compose.yml"
    if [[ $DEPLOYMENT_MODE == "production" ]]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    # Check if compose file exists
    if [[ ! -f "$compose_file" ]]; then
        log_error "Docker compose file not found: $compose_file"
        exit 1
    fi
    
    # Build images
    log_info "Building Docker images..."
    docker-compose -f "$compose_file" build --no-cache
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "$compose_file" down --remove-orphans || true
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$compose_file" up -d
    
    # Wait for containers to be ready
    log_info "Waiting for containers to start..."
    sleep 10
    
    # Verify containers are running
    if ! docker-compose -f "$compose_file" ps | grep -q "Up"; then
        log_error "Containers failed to start"
        docker-compose -f "$compose_file" logs
        exit 1
    fi
    
    log_success "Docker deployment completed"
}

# Deploy using NPM
deploy_npm() {
    log_info "Deploying with NPM..."
    
    cd "$PROJECT_DIR"
    
    # Install globally
    log_info "Installing package globally..."
    npm install -g .
    
    # Verify installation
    if ! command -v reactbits-mcp-server &> /dev/null; then
        log_error "Global installation failed"
        exit 1
    fi
    
    log_success "NPM deployment completed"
}

# Deploy development environment
deploy_development() {
    log_info "Setting up development environment..."
    
    cd "$PROJECT_DIR"
    
    # Install dependencies including dev dependencies
    log_info "Installing all dependencies..."
    npm install
    
    # Start development server in background
    log_info "Starting development server..."
    npm run dev &
    DEV_PID=$!
    
    # Store PID for cleanup
    echo "$DEV_PID" > .dev-server.pid
    
    log_success "Development environment started (PID: $DEV_PID)"
}

# Health check function
perform_health_check() {
    if [[ $NO_HEALTH == true ]]; then
        log_warning "Skipping health checks"
        return 0
    fi
    
    log_info "Performing health checks..."
    
    local retries=0
    while [[ $retries -lt $MAX_RETRIES ]]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            local health_response=$(curl -s "$HEALTH_CHECK_URL")
            local status=$(echo "$health_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            
            if [[ "$status" == "healthy" ]]; then
                log_success "Health check passed - server is healthy"
                return 0
            else
                log_warning "Health check returned status: $status"
            fi
        fi
        
        retries=$((retries + 1))
        log_info "Health check attempt $retries/$MAX_RETRIES failed, retrying in ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
    done
    
    log_error "Health checks failed after $MAX_RETRIES attempts"
    return 1
}

# Rollback function
rollback_deployment() {
    log_warning "Initiating rollback procedures..."
    
    case $DEPLOYMENT_MODE in
        docker)
            docker-compose down || true
            ;;
        npm)
            npm uninstall -g reactbits-mcp-server || true
            ;;
        development)
            if [[ -f ".dev-server.pid" ]]; then
                local dev_pid=$(cat .dev-server.pid)
                kill "$dev_pid" 2>/dev/null || true
                rm -f .dev-server.pid
            fi
            ;;
    esac
    
    log_info "Rollback completed"
}

# Create deployment report
create_deployment_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local report_file="deployment-report-$timestamp.json"
    
    log_info "Creating deployment report..."
    
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "deployment_mode": "$DEPLOYMENT_MODE",
  "version": "$(node -p "require('./package.json').version")",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "build_info": {
    "build_time": "$timestamp",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
  },
  "health_check": {
    "performed": $([ $NO_HEALTH == true ] && echo false || echo true),
    "status": "$(curl -s "$HEALTH_CHECK_URL" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo 'unknown')"
  }
}
EOF
    
    log_success "Deployment report created: $report_file"
}

# Main deployment function
main() {
    log_info "Starting ReactBits MCP Server deployment"
    log_info "Mode: $DEPLOYMENT_MODE"
    log_info "Build only: $BUILD_ONLY"
    log_info "Skip health checks: $NO_HEALTH"
    log_info "Force deployment: $FORCE"
    
    # Confirmation prompt
    if [[ $FORCE != true ]]; then
        echo -n "Continue with deployment? [y/N]: "
        read -r confirmation
        if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Build application
    build_application
    
    # Run tests
    if [[ $DEPLOYMENT_MODE != "development" ]]; then
        run_tests
    fi
    
    # Exit if build-only mode
    if [[ $BUILD_ONLY == true ]]; then
        log_success "Build completed successfully (build-only mode)"
        exit 0
    fi
    
    # Deploy based on mode
    case $DEPLOYMENT_MODE in
        docker)
            deploy_docker
            ;;
        npm)
            deploy_npm
            ;;
        development)
            deploy_development
            ;;
        production|testing)
            deploy_docker  # Use Docker for production/testing
            ;;
        *)
            log_error "Unknown deployment mode: $DEPLOYMENT_MODE"
            exit 1
            ;;
    esac
    
    # Perform health checks
    if ! perform_health_check; then
        log_error "Deployment failed health checks"
        exit 1
    fi
    
    # Create deployment report
    create_deployment_report
    
    log_success "Deployment completed successfully!"
    log_info "Service is running and healthy"
    
    # Show next steps
    echo ""
    log_info "Next steps:"
    case $DEPLOYMENT_MODE in
        docker)
            echo "  - View logs: docker-compose logs -f"
            echo "  - Stop service: docker-compose down"
            echo "  - Health check: curl $HEALTH_CHECK_URL"
            ;;
        npm)
            echo "  - Start server: reactbits-mcp-server"
            echo "  - Health check: curl $HEALTH_CHECK_URL"
            ;;
        development)
            echo "  - View logs: tail -f logs/app.log"
            echo "  - Stop server: kill \$(cat .dev-server.pid)"
            echo "  - Restart: npm run dev"
            ;;
    esac
}

# Run main function
main "$@"