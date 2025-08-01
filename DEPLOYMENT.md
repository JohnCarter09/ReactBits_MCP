# ReactBits MCP Server - Deployment Guide

A comprehensive production-ready deployment guide for the ReactBits Model Context Protocol server.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites) 
- [Installation Methods](#installation-methods)
- [Docker Deployment](#docker-deployment)
- [NPM Installation](#npm-installation)
- [Configuration](#configuration)
- [Health Monitoring](#health-monitoring)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Considerations](#production-considerations)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Docker (Recommended)
```bash
# Pull and run the latest version
docker run -d --name reactbits-mcp \
  -v $(pwd)/data/cache:/app/scraper-cache \
  -v $(pwd)/data/logs:/app/logs \
  reactbits/mcp-server:latest

# Check if running
docker logs reactbits-mcp
```

### NPM
```bash
# Install globally
npm install -g reactbits-mcp-server

# Run the server
reactbits-mcp-server
```

## 📋 Prerequisites

### System Requirements
- **Node.js**: >= 18.0.0
- **NPM**: >= 8.0.0
- **Memory**: Minimum 512MB RAM (1GB+ recommended)
- **Storage**: 100MB+ free space
- **OS**: Linux, macOS, or Windows

### For Docker Deployment
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0 (optional but recommended)

### For Development
- **TypeScript**: >= 4.9.0
- **Git**: Latest version

## 🛠 Installation Methods

### Method 1: Docker (Production Ready)

#### Single Container
```bash
# Create data directories
mkdir -p data/{cache,logs}

# Run with Docker
docker run -d \
  --name reactbits-mcp-server \
  --restart unless-stopped \
  -v $(pwd)/data/cache:/app/scraper-cache \
  -v $(pwd)/data/logs:/app/logs \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -e ENABLE_METRICS=true \
  reactbits/mcp-server:latest

# Verify it's running
docker exec reactbits-mcp-server node -e "console.log('Server is running')"
```

#### Docker Compose (Recommended)
```bash
# Clone or create docker-compose.yml
wget https://raw.githubusercontent.com/DavidHDev/react-bits/main/mcp-server/docker-compose.yml

# Start services
docker-compose up -d mcp-server

# View logs
docker-compose logs -f mcp-server

# Check health
docker-compose exec mcp-server npm run health-check
```

### Method 2: NPM Package

#### Global Installation
```bash
# Install globally
npm install -g reactbits-mcp-server

# Verify installation
reactbits-mcp-server --version

# Run server
reactbits-mcp-server

# Or run with custom config
NODE_ENV=production reactbits-mcp-server
```

#### Local Installation (for projects)
```bash
# Add to your project
npm install reactbits-mcp-server

# Add to package.json scripts
{
  "scripts": {
    "mcp-server": "reactbits-mcp-server"
  }
}

# Run
npm run mcp-server
```

### Method 3: From Source

#### For Development
```bash
# Clone repository
git clone https://github.com/DavidHDev/react-bits.git
cd react-bits/mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Or run production build
npm start
```

## 🐳 Docker Deployment

### Production Deployment with Docker Compose

#### 1. Create Production Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  mcp-server:
    image: reactbits/mcp-server:latest
    container_name: reactbits-mcp-prod
    restart: unless-stopped
    
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
      - ENABLE_METRICS=true
      - CACHE_EXPIRY=3600000
      - MAX_REQUESTS_PER_MINUTE=1000
    
    volumes:
      - mcp-cache:/app/scraper-cache
      - mcp-logs:/app/logs
    
    healthcheck:
      test: ["CMD", "npm", "run", "health-check"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

volumes:
  mcp-cache:
  mcp-logs:
```

#### 2. Deploy to Production
```bash
# Deploy with production config
docker-compose -f docker-compose.prod.yml up -d

# Monitor deployment
docker-compose -f docker-compose.prod.yml logs -f

# Scale if needed (load balancer required)
docker-compose -f docker-compose.prod.yml up -d --scale mcp-server=3
```

### Multi-Architecture Builds
The Docker images support multiple architectures:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (Apple Silicon, ARM 64-bit)

```bash
# Pull specific architecture
docker pull --platform linux/arm64 reactbits/mcp-server:latest
```

## 📦 NPM Installation

### Production Server Setup

#### 1. Create Service User
```bash
# Create dedicated user (Linux/macOS)
sudo useradd -r -s /bin/false reactbits-mcp
sudo mkdir -p /opt/reactbits-mcp
sudo chown reactbits-mcp:reactbits-mcp /opt/reactbits-mcp
```

#### 2. Install and Configure
```bash
# Switch to service directory
cd /opt/reactbits-mcp

# Install as service user
sudo -u reactbits-mcp npm install -g reactbits-mcp-server

# Create configuration
sudo -u reactbits-mcp cat > config.json << EOF
{
  "server": {
    "logLevel": "info",
    "enableMetrics": true,
    "enableTracing": false,
    "maxRequestsPerMinute": 1000
  }
}
EOF
```

#### 3. Create Systemd Service (Linux)
```bash
# Create service file
sudo tee /etc/systemd/system/reactbits-mcp.service << EOF
[Unit]
Description=ReactBits MCP Server
After=network.target

[Service]
Type=simple
User=reactbits-mcp
Group=reactbits-mcp
WorkingDirectory=/opt/reactbits-mcp
Environment=NODE_ENV=production
Environment=CONFIG_PATH=/opt/reactbits-mcp/config.json
ExecStart=$(which reactbits-mcp-server)
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable reactbits-mcp
sudo systemctl start reactbits-mcp

# Check status
sudo systemctl status reactbits-mcp
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `ENABLE_METRICS` | `true` | Enable metrics collection |
| `ENABLE_TRACING` | `false` | Enable request tracing |
| `CACHE_EXPIRY` | `3600000` | Cache expiry time (ms) |
| `MAX_CACHE_SIZE` | `10000` | Maximum cache entries |
| `MAX_REQUESTS_PER_MINUTE` | `100` | Rate limiting |

### Configuration File
```json
{
  "server": {
    "name": "reactbits-mcp-server",
    "version": "1.0.0",
    "logLevel": "info",
    "enableMetrics": true,
    "enableTracing": false,
    "maxRequestsPerMinute": 100,
    "cacheExpiry": 3600000,
    "maxCacheSize": 10000
  },
  "tools": {
    "search_components": {
      "enabled": true,
      "cacheExpiry": 300000
    },
    "get_component": {
      "enabled": true,
      "cacheExpiry": 600000
    },
    "list_categories": {
      "enabled": true,
      "cacheExpiry": 1800000
    }
  }
}
```

## 📊 Health Monitoring

### Health Check Endpoints

The server provides built-in health monitoring:

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health with metrics
curl http://localhost:3000/health?detailed=true

# Prometheus metrics format
curl http://localhost:3000/metrics
```

### Health Check Response
```json
{
  "status": "healthy",
  "uptime": 3600000,
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "checks": [
    {
      "name": "memory_usage",
      "status": "pass",
      "message": "Memory usage normal: 150MB heap, 200MB RSS",
      "duration": 2
    },
    {
      "name": "data_directory", 
      "status": "pass",
      "message": "Data directory accessible with 25 components",
      "duration": 5
    }
  ],
  "metrics": {
    "requestCount": 1250,
    "errorCount": 3,
    "averageResponseTime": 45.2,
    "cacheHitRate": 0.85
  }
}
```

### Monitoring with Prometheus & Grafana

#### 1. Deploy Monitoring Stack
```bash
# Using Docker Compose with monitoring profile
docker-compose --profile monitoring up -d

# Access Grafana
open http://localhost:3001
# Login: admin/admin
```

#### 2. Configure Alerts
```bash
# Edit alert rules
vim monitoring/alert_rules.yml

# Restart Prometheus
docker-compose restart prometheus
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

The repository includes a comprehensive CI/CD pipeline that:

1. **Tests** code on multiple Node.js versions and platforms
2. **Builds** Docker images for multiple architectures  
3. **Publishes** to NPM registry automatically
4. **Creates** GitHub releases with changelog
5. **Deploys** Docker images to registry

#### Required Secrets

Add these secrets to your GitHub repository:

```bash
# NPM publishing
NPM_TOKEN=your_npm_token

# Docker Hub publishing  
DOCKER_HUB_USERNAME=your_docker_username
DOCKER_HUB_ACCESS_TOKEN=your_docker_token
```

#### Triggering Releases

```bash
# Update version in package.json
npm version patch  # or minor, major

# Push to trigger CI/CD
git push origin main --tags

# CI/CD will automatically:
# 1. Run tests
# 2. Build Docker images
# 3. Publish to NPM
# 4. Create GitHub release
```

### Manual Deployment

#### Build and Test Locally
```bash
# Run full test suite
npm run test:ci

# Build for production
npm run build

# Test Docker build
npm run docker:build
npm run docker:test

# Publish (requires authentication)
npm publish
```

## 🏭 Production Considerations

### Performance Optimization

#### 1. Memory Management
```bash
# Set Node.js memory limits
NODE_OPTIONS="--max-old-space-size=1024" reactbits-mcp-server

# Monitor memory usage
docker stats reactbits-mcp-server

# Configure garbage collection
NODE_OPTIONS="--gc-interval=100" reactbits-mcp-server
```

#### 2. Caching Strategy
```javascript
// Optimize cache settings
{
  "server": {
    "maxCacheSize": 50000,     // Increase for high-traffic
    "cacheExpiry": 1800000     // 30 minutes
  }
}
```

#### 3. Load Balancing
```yaml
# docker-compose.yml for load balancing
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
  
  mcp-server:
    deploy:
      replicas: 3
```

### Security Hardening

#### 1. Container Security
```dockerfile
# Run as non-root user
USER 1001

# Read-only filesystem
--read-only --tmpfs /tmp

# Drop capabilities
--cap-drop=ALL
```

#### 2. Network Security
```bash
# Restrict network access
docker network create --driver bridge mcp-network

# Use firewall rules
sudo ufw allow from 10.0.0.0/8 to any port 3000
```

#### 3. Secrets Management
```bash
# Use Docker secrets
echo "sensitive_config" | docker secret create mcp_config -

# Mount in container
docker service create \
  --secret mcp_config \
  reactbits/mcp-server:latest
```

### Backup and Recovery

#### 1. Data Backup
```bash
# Backup cache and logs
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/reactbits-mcp"
DATE=$(date +%Y%m%d-%H%M%S)

docker exec reactbits-mcp-server tar -czf - /app/scraper-cache > \
  "$BACKUP_DIR/cache-$DATE.tar.gz"
```

#### 2. Disaster Recovery
```bash
# Recovery procedure
1. Stop service
2. Restore data from backup
3. Restart service
4. Verify health checks

# Automated recovery script
./scripts/disaster-recovery.sh restore backup-20240115.tar.gz
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Server Won't Start
```bash
# Check logs
docker logs reactbits-mcp-server
# or
journalctl -u reactbits-mcp -f

# Common causes:
# - Port already in use
# - Insufficient permissions
# - Missing dependencies
# - Invalid configuration
```

#### 2. Memory Issues
```bash
# Check memory usage
docker stats reactbits-mcp-server

# Increase memory limit
docker run -m 1g reactbits/mcp-server:latest

# Enable swap if needed
sudo swapon -s
```

#### 3. Performance Issues
```bash
# Enable debug logging
LOG_LEVEL=debug reactbits-mcp-server

# Check metrics
curl http://localhost:3000/health?detailed=true

# Profile performance
NODE_OPTIONS="--prof" reactbits-mcp-server
```

#### 4. Data Loading Issues
```bash
# Check data directory
ls -la production-react-bits-extraction/

# Verify component index
cat production-react-bits-extraction/component-index.json | jq length

# Reload data
docker exec reactbits-mcp-server rm -rf /app/scraper-cache/*
docker restart reactbits-mcp-server
```

### Debug Mode

#### Enable Detailed Logging
```bash
# Set debug environment
DEBUG=* LOG_LEVEL=debug reactbits-mcp-server

# Or with Docker
docker run -e DEBUG=* -e LOG_LEVEL=debug reactbits/mcp-server:latest
```

#### Health Check Debugging
```bash
# Detailed health check
curl "http://localhost:3000/health?detailed=true&include=all"

# Test specific components
curl "http://localhost:3000/health/check/memory_usage"
```

### Getting Help

#### 1. Check Documentation
- [Architecture Guide](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [GitHub Issues](https://github.com/DavidHDev/react-bits/issues)

#### 2. Community Support
- [ReactBits Discord](https://discord.gg/reactbits)
- [GitHub Discussions](https://github.com/DavidHDev/react-bits/discussions)

#### 3. Professional Support
- Email: contact@reactbits.dev
- Enterprise support available

---

## 📚 Additional Resources

- [Configuration Reference](CONFIG.md)
- [API Documentation](API.md)
- [Development Guide](DEVELOPMENT.md)
- [Security Guide](SECURITY.md)
- [Performance Tuning](PERFORMANCE.md)

---

*Last updated: 2024-01-15*