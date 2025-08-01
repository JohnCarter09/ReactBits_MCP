# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the ReactBits MCP Server - a Model Context Protocol implementation that provides programmatic access to React component libraries from ReactBits.dev. The project includes both a production-ready MCP server and comprehensive web scraping tools for component extraction.

## Core Architecture

### MCP Server (`src/`)
- **`src/index.ts`**: Main MCP server implementation with ReactBitsMCPServer class and five core tools
- **`src/types.ts`**: Comprehensive TypeScript interfaces for components, categories, and API responses
- **`src/config.ts`**: Centralized configuration including server settings, component categories, and MCP registry
- **`src/utils.ts`**: Performance utilities including caching (LRU), validation, and MCP error handling
- **`src/integration-example.ts`**: Demonstrates integration patterns with other MCP servers

### Web Scraping System
- **`production-react-bits-scraper.js`**: Production-ready scraper with priority-based extraction
- **Component extractors**: Various scraper implementations for different approaches
- **Cached data**: `scraper-cache/` contains analysis results and extraction reports

## Development Commands

### Building and Running
```bash
# Build TypeScript to dist/
npm run build

# Run production MCP server
npm start

# Run development server with hot reload
npm run dev

# Test scraper functionality
node test-extractor.js
npm test
```

### Component Extraction
```bash
# Run production scraper (main extraction tool)
node production-react-bits-scraper.js

# Run with verbose debugging
DEBUG=* node production-react-bits-scraper.js
npm run extract:verbose

# Basic extraction
npm run extract
```

## MCP Server Tools

The server provides five core tools for component management:

1. **`search_components`**: Search with filters (query, category, tags, difficulty, hasDemo, pagination)
2. **`get_component`**: Get detailed component information by ID
3. **`list_categories`**: Get all available component categories
4. **`browse_category`**: Browse components within a specific category
5. **`get_random_component`**: Get random component for inspiration

## Configuration

### MCP Integration (`MCP_config.json`)
Configured integrations with other MCP servers:
- **puppeteer**: Browser automation for component screenshots
- **magicui**: Component enhancement suggestions  
- **playwright**: Interactive component testing
- **firecrawl**: Web scraping with API key management

### Component Categories (`src/config.ts`)
Pre-configured categories including:
- text-animations, backgrounds, components, animations
- buttons, button-animations, inputs, navigation
- feedback, layout, utilities

## Performance Features

### Caching Strategy
- **LRU Cache**: Multi-tier caching for components, categories, and search results
- **TTL Support**: Configurable cache expiration times
- **Performance Monitoring**: Execution timing and cache hit/miss tracking

### Error Handling
- **MCP-Compliant Errors**: Proper ErrorCode usage for protocol compliance
- **Input Validation**: Schema validation and sanitization
- **Fault Tolerance**: Graceful degradation and retry mechanisms

## Data Extraction System

### Priority-Based Extraction
Components are extracted based on priority scores:
- **High Priority (8+)**: Animated text, buttons, 3D animations
- **Medium Priority (5-7)**: Forms, navigation, layout utilities
- **Low Priority (1-4)**: Basic UI, simple utilities, configuration

### Output Structure
```
production-react-bits-extraction/
├── components/           # Extracted components by category
├── component-index.json  # Quick reference index
└── comprehensive-extraction-report.json  # Detailed statistics
```

## Key Integration Patterns

### Cross-Server Communication
- Client management for multiple MCP server connections
- Tool orchestration combining different server capabilities
- Error isolation preventing cascade failures

### TypeScript Configuration
- **Target**: ES2022 with ESNext modules
- **Strict mode**: Full type safety enforcement
- **Output**: `dist/` directory with declarations
- **Module resolution**: Node.js compatible

## Security Considerations

- Input validation with schema checking
- Safe error messages avoiding internal detail exposure
- Environment-based configuration for sensitive data
- Rate limiting and request throttling

## Testing Strategy

- **Unit Tests**: Individual component and utility testing
- **Integration Tests**: MCP protocol compliance validation
- **Performance Tests**: Cache and response time validation
- **Error Scenario Tests**: Comprehensive error handling verification

## File Organization Priority

When working with this codebase:
1. **Core MCP Server**: Focus on `src/` directory for protocol implementation
2. **Component Data**: Use `production-react-bits-extraction/` for extracted components
3. **Scraping Tools**: `production-react-bits-scraper.js` is the main extraction tool
4. **Configuration**: `MCP_config.json` and `src/config.ts` for server setup
5. **Documentation**: `docs/ARCHITECTURE.md` for detailed technical specifications