#!/bin/bash
# ============================================================================
# ReactBits MCP Server Health Check Script
# Comprehensive health monitoring and validation
# ============================================================================

set -euo pipefail

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
METRICS_URL="${METRICS_URL:-http://localhost:3000/metrics}"
TIMEOUT="${TIMEOUT:-10}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-human}"
DETAILED="${DETAILED:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Exit codes
EXIT_OK=0
EXIT_WARNING=1
EXIT_CRITICAL=2
EXIT_UNKNOWN=3

# Logging functions
log_info() {
    if [[ $OUTPUT_FORMAT == "human" ]]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [[ $OUTPUT_FORMAT == "human" ]]; then
        echo -e "${GREEN}[OK]${NC} $1"
    fi
}

log_warning() {
    if [[ $OUTPUT_FORMAT == "human" ]]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

log_error() {
    if [[ $OUTPUT_FORMAT == "human" ]]; then
        echo -e "${RED}[ERROR]${NC} $1"
    fi
}

# Help function
show_help() {
    echo "ReactBits MCP Server Health Check Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --url URL          Health check URL (default: $HEALTH_URL)"
    echo "  --timeout SECONDS  Request timeout (default: $TIMEOUT)"
    echo "  --format FORMAT    Output format: human|json|nagios (default: $OUTPUT_FORMAT)"
    echo "  --detailed         Show detailed health information"
    echo "  --metrics          Also check /metrics endpoint"
    echo "  --silent           Only output errors"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Basic health check"
    echo "  $0 --detailed --metrics               # Detailed check with metrics"
    echo "  $0 --format json                      # JSON output"
    echo "  $0 --url http://prod:3000/health      # Custom URL"
    echo ""
    echo "Exit codes:"
    echo "  0  - OK"
    echo "  1  - WARNING"
    echo "  2  - CRITICAL"
    echo "  3  - UNKNOWN"
}

# Parse command line arguments
CHECK_METRICS=false
SILENT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            HEALTH_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --detailed)
            DETAILED=true
            shift
            ;;
        --metrics)
            CHECK_METRICS=true
            shift
            ;;
        --silent)
            SILENT=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit $EXIT_UNKNOWN
            ;;
    esac
done

# Validate output format
if [[ ! "$OUTPUT_FORMAT" =~ ^(human|json|nagios)$ ]]; then
    log_error "Invalid output format: $OUTPUT_FORMAT"
    exit $EXIT_UNKNOWN
fi

# Health check function
check_health() {
    local response
    local http_code
    local health_data
    
    # Make HTTP request
    if ! response=$(curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$HEALTH_URL" 2>/dev/null); then
        return $EXIT_CRITICAL
    fi
    
    # Extract HTTP code and response body
    http_code="${response: -3}"
    health_data="${response%???}"
    
    # Check HTTP status
    if [[ "$http_code" != "200" ]]; then
        echo "HTTP_CODE:$http_code"
        return $EXIT_CRITICAL
    fi
    
    # Parse JSON response
    if ! echo "$health_data" | jq . >/dev/null 2>&1; then
        echo "INVALID_JSON"
        return $EXIT_CRITICAL
    fi
    
    # Extract health status
    local status
    if ! status=$(echo "$health_data" | jq -r '.status' 2>/dev/null); then
        echo "NO_STATUS_FIELD"
        return $EXIT_CRITICAL
    fi
    
    # Check status value
    case "$status" in
        "healthy")
            echo "$health_data"
            return $EXIT_OK
            ;;
        "degraded")
            echo "$health_data"
            return $EXIT_WARNING
            ;;
        "unhealthy")
            echo "$health_data"
            return $EXIT_CRITICAL
            ;;
        *)
            echo "UNKNOWN_STATUS:$status"
            return $EXIT_UNKNOWN
            ;;
    esac
}

# Metrics check function  
check_metrics() {
    local response
    local http_code
    
    if ! response=$(curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$METRICS_URL" 2>/dev/null); then
        return $EXIT_CRITICAL
    fi
    
    http_code="${response: -3}"
    
    if [[ "$http_code" != "200" ]]; then
        return $EXIT_CRITICAL
    fi
    
    return $EXIT_OK
}

# Format output functions
format_human() {
    local health_data="$1"
    local exit_code="$2"
    local metrics_ok="${3:-true}"
    
    if [[ $SILENT == true && $exit_code == $EXIT_OK ]]; then
        return
    fi
    
    local status=$(echo "$health_data" | jq -r '.status // "unknown"')
    local uptime=$(echo "$health_data" | jq -r '.uptime // 0')
    local version=$(echo "$health_data" | jq -r '.version // "unknown"')
    
    # Convert uptime to human readable
    local uptime_human=""
    if [[ "$uptime" != "0" && "$uptime" != "null" ]]; then
        local seconds=$((uptime / 1000))
        local minutes=$((seconds / 60))
        local hours=$((minutes / 60))
        local days=$((hours / 24))
        
        if [[ $days -gt 0 ]]; then
            uptime_human="${days}d ${hours}h ${minutes}m"
        elif [[ $hours -gt 0 ]]; then
            uptime_human="${hours}h ${minutes}m"
        elif [[ $minutes -gt 0 ]]; then
            uptime_human="${minutes}m"
        else
            uptime_human="${seconds}s"
        fi
    fi
    
    # Status message
    case $exit_code in
        $EXIT_OK)
            log_success "Server is healthy"
            ;;
        $EXIT_WARNING)
            log_warning "Server is degraded"
            ;;
        $EXIT_CRITICAL)
            log_error "Server is unhealthy"
            ;;
        *)
            log_error "Unknown server status"
            ;;
    esac
    
    # Basic info
    echo "Status: $status"
    echo "Version: $version"
    if [[ -n "$uptime_human" ]]; then
        echo "Uptime: $uptime_human"
    fi
    
    # Metrics status
    if [[ $CHECK_METRICS == true ]]; then
        if [[ $metrics_ok == true ]]; then
            echo "Metrics: Available"
        else
            echo "Metrics: Unavailable"
        fi
    fi
    
    # Detailed information
    if [[ $DETAILED == true ]]; then
        echo ""
        echo "Detailed Health Information:"
        echo "$health_data" | jq .
    fi
}

format_json() {
    local health_data="$1"
    local exit_code="$2"
    local metrics_ok="${3:-true}"
    
    # Create combined JSON output
    local json_output=$(cat <<EOF
{
  "health_check": {
    "exit_code": $exit_code,
    "status_text": "$(case $exit_code in
      $EXIT_OK) echo "OK" ;;
      $EXIT_WARNING) echo "WARNING" ;;
      $EXIT_CRITICAL) echo "CRITICAL" ;;
      *) echo "UNKNOWN" ;;
    esac)",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "metrics_available": $metrics_ok
  }
}
EOF
)
    
    # Merge with health data if available
    if echo "$health_data" | jq . >/dev/null 2>&1; then
        echo "$health_data" | jq --argjson check "$json_output" '. + $check'
    else
        echo "$json_output"
    fi
}

format_nagios() {
    local health_data="$1"
    local exit_code="$2"
    local metrics_ok="${3:-true}"
    
    local status=$(echo "$health_data" | jq -r '.status // "unknown"')
    local uptime=$(echo "$health_data" | jq -r '.uptime // 0')
    
    # Nagios status text
    local status_text=""
    case $exit_code in
        $EXIT_OK)
            status_text="OK"
            ;;
        $EXIT_WARNING)
            status_text="WARNING"
            ;;
        $EXIT_CRITICAL)
            status_text="CRITICAL"
            ;;
        *)
            status_text="UNKNOWN"
            ;;
    esac
    
    # Performance data
    local perfdata=""
    if echo "$health_data" | jq '.metrics' >/dev/null 2>&1; then
        local request_count=$(echo "$health_data" | jq -r '.metrics.requestCount // 0')
        local error_count=$(echo "$health_data" | jq -r '.metrics.errorCount // 0')
        local response_time=$(echo "$health_data" | jq -r '.metrics.averageResponseTime // 0')
        
        perfdata="requests=${request_count}c errors=${error_count}c response_time=${response_time}ms uptime=${uptime}ms"
    fi
    
    echo "REACTBITS_MCP $status_text - Server status: $status | $perfdata"
}

# Main function
main() {
    local health_data=""
    local exit_code=$EXIT_UNKNOWN
    local metrics_ok=true
    
    # Perform health check
    if health_data=$(check_health); then
        case "$health_data" in
            *"HTTP_CODE:"*)
                log_error "HTTP error: ${health_data#HTTP_CODE:}"
                exit_code=$EXIT_CRITICAL
                ;;
            "INVALID_JSON")
                log_error "Invalid JSON response"
                exit_code=$EXIT_CRITICAL
                ;;
            "NO_STATUS_FIELD")
                log_error "No status field in response"
                exit_code=$EXIT_CRITICAL
                ;;
            *"UNKNOWN_STATUS:"*)
                log_error "Unknown status: ${health_data#UNKNOWN_STATUS:}"
                exit_code=$EXIT_UNKNOWN
                ;;
            *)
                # Valid JSON response
                local status=$(echo "$health_data" | jq -r '.status')
                case "$status" in
                    "healthy")
                        exit_code=$EXIT_OK
                        ;;
                    "degraded")
                        exit_code=$EXIT_WARNING
                        ;;
                    "unhealthy")
                        exit_code=$EXIT_CRITICAL
                        ;;
                esac
                ;;
        esac
    else
        log_error "Failed to connect to health endpoint"
        exit_code=$EXIT_CRITICAL
        health_data='{"status":"unreachable","error":"connection_failed"}'
    fi
    
    # Check metrics if requested
    if [[ $CHECK_METRICS == true ]]; then
        if ! check_metrics >/dev/null 2>&1; then
            metrics_ok=false
            if [[ $exit_code == $EXIT_OK ]]; then
                exit_code=$EXIT_WARNING
            fi
        fi
    fi
    
    # Format and output results
    case $OUTPUT_FORMAT in
        human)
            format_human "$health_data" "$exit_code" "$metrics_ok"
            ;;
        json)
            format_json "$health_data" "$exit_code" "$metrics_ok"
            ;;
        nagios)
            format_nagios "$health_data" "$exit_code" "$metrics_ok"
            ;;
    esac
    
    exit $exit_code
}

# Run main function
main "$@"