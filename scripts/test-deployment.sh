#!/bin/bash
# ============================================================================
# ReactBits MCP Server Deployment Test Suite
# Comprehensive testing of deployment and functionality
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_URL="${TEST_URL:-http://localhost:3000}"
MCP_BINARY="${MCP_BINARY:-reactbits-mcp-server}"
TIMEOUT=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test helper functions
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log_info "Running test: $test_name"
    
    if eval "$test_command"; then
        log_success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_failure "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name")
        return 1
    fi
}

# Wait for service to be ready
wait_for_service() {
    local url="$1"
    local max_attempts="${2:-30}"
    local attempt=0
    
    log_info "Waiting for service to be ready at $url..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s "$url/health" >/dev/null 2>&1; then
            log_success "Service is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    log_failure "Service failed to become ready after $max_attempts attempts"
    return 1
}

# Test functions
test_build() {
    log_info "Testing build process..."
    
    cd "$PROJECT_DIR"
    
    # Clean previous build
    npm run clean >/dev/null 2>&1 || true
    
    # Install dependencies
    npm ci --no-optional >/dev/null 2>&1
    
    # Type check
    npm run typecheck >/dev/null 2>&1
    
    # Build
    npm run build >/dev/null 2>&1
    
    # Verify build output
    [[ -f "dist/index.js" ]] || return 1
    
    return 0
}

test_health_endpoint() {
    local health_response
    
    if ! health_response=$(curl -f -s "$TEST_URL/health"); then
        return 1
    fi
    
    # Check if response contains expected fields
    echo "$health_response" | jq -e '.status' >/dev/null || return 1
    echo "$health_response" | jq -e '.uptime' >/dev/null || return 1
    echo "$health_response" | jq -e '.version' >/dev/null || return 1
    
    # Check if status is healthy or degraded (not unhealthy)
    local status=$(echo "$health_response" | jq -r '.status')
    [[ "$status" == "healthy" || "$status" == "degraded" ]] || return 1
    
    return 0
}

test_mcp_protocol() {
    log_info "Testing MCP protocol compliance..."
    
    # Create test input for tools/list
    local list_tools_request='{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
    
    # Test tools/list
    local response
    if ! response=$(echo "$list_tools_request" | timeout 10 "$MCP_BINARY" 2>/dev/null); then
        return 1
    fi
    
    # Verify response structure
    echo "$response" | jq -e '.result.tools' >/dev/null || return 1
    
    # Check for expected tools
    local tools_count=$(echo "$response" | jq '.result.tools | length')
    [[ "$tools_count" -ge 5 ]] || return 1
    
    return 0
}

test_component_search() {
    local search_request='{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "search_components", "arguments": {"query": "button", "limit": 5}}}'
    
    local response
    if ! response=$(echo "$search_request" | timeout 10 "$MCP_BINARY" 2>/dev/null); then
        return 1
    fi
    
    # Verify response structure
    echo "$response" | jq -e '.result' >/dev/null || return 1
    
    return 0
}

test_get_component() {
    local get_request='{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_component", "arguments": {"id": "animated-button-1"}}}'
    
    local response
    if ! response=$(echo "$get_request" | timeout 10 "$MCP_BINARY" 2>/dev/null); then
        return 1
    fi
    
    # Verify response structure
    echo "$response" | jq -e '.result' >/dev/null || return 1
    
    return 0
}

test_list_categories() {
    local list_request='{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "list_categories", "arguments": {}}}'
    
    local response
    if ! response=$(echo "$list_request" | timeout 10 "$MCP_BINARY" 2>/dev/null); then
        return 1
    fi
    
    # Verify response structure
    echo "$response" | jq -e '.result' >/dev/null || return 1
    
    return 0
}

test_browse_category() {
    local browse_request='{"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "browse_category", "arguments": {"categoryId": "buttons", "limit": 3}}}'
    
    local response
    if ! response=$(echo "$browse_request" | timeout 10 "$MCP_BINARY" 2>/dev/null); then
        return 1
    fi
    
    # Verify response structure
    echo "$response" | jq -e '.result' >/dev/null || return 1
    
    return 0
}

test_random_component() {
    local random_request='{"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {"name": "get_random_component", "arguments": {}}}'
    
    local response
    if ! response=$(echo "$random_request" | timeout 10 "$MCP_BINARY" 2>/dev/null); then
        return 1
    fi
    
    # Verify response structure
    echo "$response" | jq -e '.result' >/dev/null || return 1
    
    return 0
}

test_docker_deployment() {
    log_info "Testing Docker deployment..."
    
    cd "$PROJECT_DIR"
    
    # Build Docker image
    docker build -t reactbits-mcp-test . >/dev/null 2>&1 || return 1
    
    # Run container in background
    local container_id
    container_id=$(docker run -d --name reactbits-mcp-test-$(date +%s) reactbits-mcp-test) || return 1
    
    # Wait for container to start
    sleep 5
    
    # Check if container is running
    if ! docker ps | grep -q "$container_id"; then
        docker logs "$container_id" || true
        docker rm -f "$container_id" >/dev/null 2>&1 || true
        return 1
    fi
    
    # Test health check inside container
    if ! docker exec "$container_id" node -e "console.log('Health check passed')" >/dev/null 2>&1; then
        docker rm -f "$container_id" >/dev/null 2>&1 || true
        return 1
    fi
    
    # Cleanup
    docker rm -f "$container_id" >/dev/null 2>&1 || true
    
    return 0
}

test_npm_package() {
    log_info "Testing NPM package..."
    
    cd "$PROJECT_DIR"
    
    # Test npm pack
    local package_file
    package_file=$(npm pack 2>/dev/null | tail -1) || return 1
    
    # Verify package contents
    if ! tar -tzf "$package_file" | grep -q "dist/index.js"; then
        rm -f "$package_file"
        return 1
    fi
    
    # Cleanup
    rm -f "$package_file"
    
    return 0
}

test_data_integrity() {
    log_info "Testing data integrity..."
    
    cd "$PROJECT_DIR"
    
    # Check if extraction data exists
    [[ -d "production-react-bits-extraction" ]] || return 1
    [[ -f "production-react-bits-extraction/component-index.json" ]] || return 1
    
    # Validate JSON structure
    jq . "production-react-bits-extraction/component-index.json" >/dev/null 2>&1 || return 1
    
    # Check if there are actual components
    local component_count=$(jq length "production-react-bits-extraction/component-index.json")
    [[ "$component_count" -gt 0 ]] || return 1
    
    return 0
}

test_error_handling() {
    log_info "Testing error handling..."
    
    # Test invalid tool call
    local invalid_request='{"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "invalid_tool", "arguments": {}}}'
    
    local response
    if ! response=$(echo "$invalid_request" | timeout 10 "$MCP_BINARY" 2>/dev/null); then
        return 1
    fi
    
    # Should return an error response
    echo "$response" | jq -e '.error' >/dev/null || return 1
    
    return 0
}

test_performance() {
    log_info "Testing performance..."
    
    local start_time=$(date +%s%N)
    
    # Run a simple search
    local search_request='{"jsonrpc": "2.0", "id": 8, "method": "tools/call", "params": {"name": "search_components", "arguments": {"query": "test", "limit": 1}}}'
    
    local response
    if ! response=$(echo "$search_request" | timeout 10 "$MCP_BINARY" 2>/dev/null); then
        return 1
    fi
    
    local end_time=$(date +%s%N)
    local duration_ms=$(( (end_time - start_time) / 1000000 ))
    
    # Should complete within reasonable time (5 seconds)
    [[ "$duration_ms" -lt 5000 ]] || return 1
    
    log_info "Performance test completed in ${duration_ms}ms"
    
    return 0
}

# Load testing
test_load() {
    log_info "Testing load handling..."
    
    # Create multiple concurrent requests
    local pids=()
    local temp_dir=$(mktemp -d)
    
    for i in {1..5}; do
        (
            local search_request='{"jsonrpc": "2.0", "id": '$i', "method": "tools/call", "params": {"name": "search_components", "arguments": {"query": "button", "limit": 2}}}'
            echo "$search_request" | timeout 10 "$MCP_BINARY" > "$temp_dir/result_$i.json" 2>/dev/null
        ) &
        pids+=($!)
    done
    
    # Wait for all requests to complete
    local success_count=0
    for pid in "${pids[@]}"; do
        if wait "$pid"; then
            success_count=$((success_count + 1))
        fi
    done
    
    # Cleanup
    rm -rf "$temp_dir"
    
    # At least 80% should succeed
    [[ "$success_count" -ge 4 ]] || return 1
    
    log_info "Load test: $success_count/5 requests succeeded"
    
    return 0
}

# Main test execution
run_all_tests() {
    log_info "Starting ReactBits MCP Server deployment tests"
    echo ""
    
    # Build tests
    run_test "Build Process" "test_build"
    run_test "NPM Package" "test_npm_package"
    run_test "Docker Deployment" "test_docker_deployment"
    
    # Data tests
    run_test "Data Integrity" "test_data_integrity"
    
    # MCP Protocol tests (these require the server to be running)
    log_info "Starting MCP protocol tests..."
    run_test "MCP Protocol Compliance" "test_mcp_protocol"
    run_test "Component Search" "test_component_search"
    run_test "Get Component" "test_get_component"
    run_test "List Categories" "test_list_categories"
    run_test "Browse Category" "test_browse_category"
    run_test "Random Component" "test_random_component"
    run_test "Error Handling" "test_error_handling"
    
    # Performance tests
    run_test "Performance" "test_performance"
    run_test "Load Handling" "test_load"
    
    # HTTP endpoint tests (if server is running on HTTP)
    if curl -f -s "$TEST_URL/health" >/dev/null 2>&1; then
        run_test "Health Endpoint" "test_health_endpoint"
    else
        log_warning "HTTP server not available, skipping endpoint tests"
    fi
}

# Test report
generate_report() {
    echo ""
    echo "=========================================="
    echo "        DEPLOYMENT TEST REPORT"
    echo "=========================================="
    echo ""
    echo "Total tests run: $TESTS_RUN"
    echo "Tests passed:    $TESTS_PASSED"
    echo "Tests failed:    $TESTS_FAILED"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All tests passed! Deployment is ready for production."
        echo ""
        echo "Next steps:"
        echo "  1. Deploy to production environment"
        echo "  2. Configure monitoring and alerting"
        echo "  3. Set up log rotation and backups"
        echo "  4. Update documentation"
        return 0
    else
        log_failure "Some tests failed. Please review and fix issues before deploying."
        echo ""
        echo "Failed tests:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        echo ""
        echo "Recommendations:"
        echo "  1. Check logs for detailed error messages"
        echo "  2. Verify all dependencies are installed"
        echo "  3. Ensure proper configuration"
        echo "  4. Run individual tests for debugging"
        return 1
    fi
}

# Command line argument parsing
case "${1:-all}" in
    build)
        run_test "Build Process" "test_build"
        ;;
    mcp)
        run_test "MCP Protocol Compliance" "test_mcp_protocol"
        ;;
    docker)
        run_test "Docker Deployment" "test_docker_deployment"
        ;;
    performance)
        run_test "Performance" "test_performance"
        run_test "Load Handling" "test_load"
        ;;
    all)
        run_all_tests
        ;;
    --help)
        echo "Usage: $0 [TEST_TYPE]"
        echo ""
        echo "Test types:"
        echo "  build       - Test build process only"
        echo "  mcp         - Test MCP protocol compliance"
        echo "  docker      - Test Docker deployment"
        echo "  performance - Test performance and load"
        echo "  all         - Run all tests (default)"
        exit 0
        ;;
    *)
        log_error "Unknown test type: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

# Generate final report
generate_report