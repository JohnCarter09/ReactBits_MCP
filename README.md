# ReactBits MCP Server

A production-ready [Model Context Protocol](https://modelcontextprotocol.io) server for browsing and retrieving React components from [ReactBits.dev](https://reactbits.dev) with comprehensive TypeScript support, real data integration, and advanced deployment capabilities.

## 🚀 Features

### Core MCP Capabilities
- **🔧 5 MCP Tools**: Search, browse, and retrieve React components with full MCP protocol compliance
- **📊 Real Data Integration**: Live component data from ReactBits.dev with automated scraping
- **⚡ Performance Optimized**: Advanced caching, rate limiting, and memory management
- **🛡️ Production Ready**: Health monitoring, metrics collection, and error handling

### Developer Experience
- **📝 TypeScript First**: Full type safety with comprehensive type definitions
- **🐳 Docker Support**: Multi-stage builds, development/production configurations
- **🔄 CI/CD Pipeline**: Automated testing, building, and publishing with GitHub Actions
- **📈 Monitoring**: Built-in health checks, Prometheus metrics, and Grafana dashboards

### Deployment Options
- **📦 NPM Package**: Global or local installation with `npm install -g reactbits-mcp-server`
- **🐳 Docker Images**: Multi-architecture support (AMD64, ARM64) with security hardening
- **☁️ Cloud Ready**: Production-grade configuration for AWS, GCP, Azure, and Kubernetes

## 📋 Quick Start

### Docker (Recommended)
```bash
# Run with Docker
docker run -d --name reactbits-mcp \
  -v $(pwd)/data:/app/data \
  reactbits/mcp-server:latest

# Or use Docker Compose
curl -O https://raw.githubusercontent.com/DavidHDev/react-bits/main/mcp-server/docker-compose.yml
docker-compose up -d
```

### NPM Installation
```bash
# Install globally
npm install -g reactbits-mcp-server

# Run the server
reactbits-mcp-server

# Or use with Claude Desktop
# Add to your MCP configuration
```

### Claude Desktop Integration
Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "reactbits": {
      "command": "reactbits-mcp-server",
      "args": []
    }
  }
}
```

## 🛠 Available Tools

### 1. `search_components`
Search for React components with advanced filtering:
```typescript
// Search for animated buttons
{
  "query": "animated button",
  "category": "buttons",
  "difficulty": "beginner",
  "limit": 10
}
```

### 2. `get_component`
Retrieve detailed component information with full source code:
```typescript
{
  "id": "animated-button-1",
  "includeCode": true,
  "includeExamples": true
}
```

### 3. `list_categories`
Get all available component categories:
```typescript
{} // No parameters needed
```

### 4. `browse_category`
Browse components within a specific category:
```typescript
{
  "categoryId": "buttons",
  "limit": 20,
  "offset": 0
}
```

### 5. `get_random_component`
Get a random component for inspiration:
```typescript
{} // No parameters needed
```

## 📊 Real Data Integration

The server includes live data integration with ReactBits.dev:

- **25+ Real Components**: Automatically scraped and indexed from ReactBits.dev
- **Live Updates**: Scheduled data refresh to keep components current
- **Rich Metadata**: Full component analysis including dependencies, complexity, and styling
- **Code Examples**: Complete TypeScript/React source code with best practices

### Component Categories
- **🎨 UI Components**: Core interface elements
- **🎯 Animations**: Smooth transitions and effects  
- **🧭 Navigation**: Headers, sidebars, and layout utilities
- **💬 Feedback**: Toasters, tooltips, and notifications
- **🔘 Buttons**: Interactive elements with various styles

## 🏗 Architecture

### Production-Grade Features
- **Caching System**: Multi-level LRU caching with TTL support
- **Rate Limiting**: Configurable request throttling with client tracking
- **Error Handling**: Comprehensive error recovery and logging
- **Health Monitoring**: Built-in health checks and metrics collection
- **Security**: Input validation, sanitization, and secure defaults

### Performance Optimization
- **Memory Management**: Configurable limits and garbage collection
- **Request Batching**: Efficient data loading and processing
- **Compression**: Optimized data structures and transmission
- **Lazy Loading**: On-demand component code fetching

## 🚀 Deployment

### Development
```bash
git clone https://github.com/DavidHDev/react-bits.git
cd react-bits/mcp-server
npm install
npm run dev
```

### Production with Docker
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# With monitoring stack
docker-compose --profile monitoring up -d

# Access Grafana dashboard
open http://localhost:3001
```

### Kubernetes
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment
kubectl get pods -l app=reactbits-mcp-server
```

## 📈 Monitoring & Observability

### Health Checks
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed metrics
curl http://localhost:3000/health?detailed=true

# Prometheus metrics
curl http://localhost:3000/metrics
```

### Grafana Dashboard
Pre-configured dashboard includes:
- Request rate and response times
- Memory and CPU usage
- Cache hit rates and performance
- Error rates and health status
- Component data freshness

## ⚙️ Configuration

### Environment Variables
```bash
NODE_ENV=production
LOG_LEVEL=info
ENABLE_METRICS=true
CACHE_EXPIRY=3600000
MAX_REQUESTS_PER_MINUTE=1000
```

### Configuration File
```json
{
  "server": {
    "logLevel": "info",
    "enableMetrics": true,
    "maxRequestsPerMinute": 1000,
    "cacheExpiry": 3600000
  },
  "tools": {
    "search_components": {
      "enabled": true,
      "cacheExpiry": 300000
    }
  }
}
```

## 🔒 Security

### Security Features
- **Input Validation**: JSON schema validation for all inputs
- **Rate Limiting**: Configurable request throttling
- **Error Sanitization**: Safe error messages without data leaks
- **Container Security**: Non-root user, read-only filesystem
- **Dependency Scanning**: Automated vulnerability checks

### Security Best Practices
- Run with minimal privileges
- Use secrets management for sensitive configuration
- Enable security headers and CORS
- Regular security updates via automated CI/CD

## 🧪 Testing

### Test Suite
```bash
# Run all tests
npm test

# Type checking
npm run typecheck

# CI test suite
npm run test:ci

# Docker tests
npm run docker:test
```

### MCP Protocol Compliance
- Full MCP specification compliance testing
- Tool schema validation
- Error handling verification
- Performance benchmarking

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT.md)**: Comprehensive deployment instructions
- **[Architecture Guide](docs/ARCHITECTURE.md)**: System design and architecture
- **[API Reference](docs/API.md)**: Complete API documentation
- **[Configuration Guide](CONFIG.md)**: Configuration options and examples

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Fork and clone
git clone https://github.com/your-username/react-bits.git
cd react-bits/mcp-server

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## 📝 License

MIT © [ReactBits Team](https://reactbits.dev)

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- [ReactBits.dev](https://reactbits.dev) component library. All credit to the creator of ReactBits
- TypeScript and Node.js communities

---

## 🔗 Links

- **Website**: [https://reactbits.dev](https://reactbits.dev)
- **Documentation**: [https://docs.reactbits.dev](https://docs.reactbits.dev)
- **NPM Package**: [https://www.npmjs.com/package/reactbits-mcp-server](https://www.npmjs.com/package/reactbits-mcp-server)
- **Docker Hub**: [https://hub.docker.com/r/reactbits/mcp-server](https://hub.docker.com/r/reactbits/mcp-server)
- **GitHub**: [https://github.com/DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)

---

*Built with ❤️ by the ReactBits team*
