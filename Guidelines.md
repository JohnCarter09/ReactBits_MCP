# ReactBits MCP Server - Build & Deployment Guide

This guide covers the technical build and deployment process for creating a ReactBits MCP server using Claude Code.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git for version control
- NPM account for publishing (create at npmjs.com)

## Project Setup

### 1. Create Project Directory
```bash
mkdir reactbits-mcp-server
cd reactbits-mcp-server
```

### 2. Initialize Project Structure
Create the following directory structure:
```
reactbits-mcp-server/
├── src/
├── docs/
├── examples/
├── .gitignore
├── README.md
└── package.json (will be created by Claude Code)
```

```bash
mkdir src docs examples
touch .gitignore README.md
```

### 3. Create .gitignore
```bash
echo "node_modules/
dist/
.env
*.log
.DS_Store
coverage/
.nyc_output/
.cache/" > .gitignore
```

## Build Process

### 1. Initial Build Setup
```bash
# Install dependencies after Claude Code creates package.json
npm install

# Build TypeScript to JavaScript
npm run build

# Verify build output
ls -la dist/
```

### 2. Development Build
```bash
# Run in development mode with auto-reload
npm run dev

# Or watch mode for continuous building
npm run watch
```

### 3. Production Build
```bash
# Clean previous build
rm -rf dist/

# Build for production
npm run build

# Make executable
chmod +x dist/index.js

# Test production build
node dist/index.js
```

### 4. Build Verification
```bash
# Test MCP server functionality
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js

# Verify package contents
npm pack --dry-run
```

## Testing Before Deployment

### 1. Local Testing
```bash
# Test TypeScript compilation
npx tsc --noEmit

# Test MCP server locally
node dist/index.js &
PID=$!

# Send test requests
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | nc localhost 3000
kill $PID
```

### 2. Integration Testing
```bash
# Test with Claude Desktop (add to config first)
# Edit ~/.config/Claude\ Desktop/claude_desktop_config.json:
{
  "mcpServers": {
    "reactbits-dev": {
      "command": "node",
      "args": ["/full/path/to/your/dist/index.js"]
    }
  }
}

# Restart Claude Desktop and test
```

### 3. Package Testing
```bash
# Test npm pack
npm pack

# Install locally from tarball
npm install -g ./reactbits-mcp-server-1.0.0.tgz

# Test global installation
reactbits-mcp-server --help
```

## Deployment Options

### Option 1: NPM Registry (Recommended)

#### Pre-publish Setup
```bash
# Login to npm
npm login

# Verify authentication
npm whoami

# Check package name availability
npm view reactbits-mcp-server
# Should return 404 if available
```

#### Version Management
```bash
# Update version (patch/minor/major)
npm version patch

# Or manually edit package.json version
```

#### Publish to NPM
```bash
# Dry run first
npm publish --dry-run

# Publish for real
npm publish

# Verify publication
npm view reactbits-mcp-server
```

#### Post-publish
```bash
# Test installation
npm install -g reactbits-mcp-server

# Verify global command works
reactbits-mcp-server --version
```

### Option 2: GitHub Releases

#### Setup GitHub Repository
```bash
# Initialize git if not done
git init
git add .
git commit -m "Initial commit"

# Add GitHub remote
git remote add origin https://github.com/yourusername/reactbits-mcp-server.git
git push -u origin main
```

#### Create Release
```bash
# Tag version
git tag v1.0.0
git push origin v1.0.0

# Build release assets
npm run build
tar -czf reactbits-mcp-server-v1.0.0.tar.gz dist/ package.json README.md

# Upload to GitHub releases page manually
# Or use GitHub CLI:
gh release create v1.0.0 reactbits-mcp-server-v1.0.0.tar.gz
```

### Option 3: Docker Distribution

#### Create Dockerfile
```bash
# Let Claude Code create:
claude-code "Create a Dockerfile for the MCP server with Node.js alpine base image"
```

#### Build and Push Docker Image
```bash
# Build image
docker build -t reactbits-mcp-server:latest .

# Tag for registry
docker tag reactbits-mcp-server:latest yourusername/reactbits-mcp-server:latest

# Push to Docker Hub
docker push yourusername/reactbits-mcp-server:latest
```

## User Installation Instructions

After deployment, users install and configure your MCP server:

### NPM Installation
```bash
# Global installation
npm install -g reactbits-mcp-server

# Verify installation
reactbits-mcp-server --version
```

### Claude Desktop Configuration
Users add this to their `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "reactbits": {
      "command": "reactbits-mcp-server"
    }
  }
}
```

### Alternative Installation Methods

#### GitHub Release
```bash
# Download and extract
curl -L -o reactbits-mcp.tar.gz https://github.com/user/repo/releases/download/v1.0.0/reactbits-mcp-server-v1.0.0.tar.gz
tar -xzf reactbits-mcp.tar.gz
cd reactbits-mcp-server

# Install dependencies and run
npm install --production
node dist/index.js
```

#### Docker
```bash
# Pull and run
docker pull yourusername/reactbits-mcp-server:latest
docker run -p 3000:3000 yourusername/reactbits-mcp-server:latest
```

## Claude Code Development Commands

### Project Initialization
```bash
# Create the complete project structure
claude-code "Create a TypeScript MCP server project for ReactBits.dev with package.json, tsconfig.json, and proper dependencies for @modelcontextprotocol/sdk, node-fetch, and cheerio. Make it an ES module with proper build scripts."

# Implement core functionality
claude-code "Create an MCP server in src/index.ts that can search and retrieve React components from ReactBits.dev. Include these tools: search_components, get_component, list_categories, browse_category, and get_random_component. Use web scraping with cheerio to extract component details, props tables, and code examples."

# Add component mapping
claude-code "Create a comprehensive mapping of ReactBits.dev component categories including text-animations, backgrounds, components, animations, buttons, cards, navigation, etc. Include specific component names for each category."

# Implement web scraping
claude-code "Implement robust web scraping logic to extract component information from ReactBits.dev pages including: component props from tables, dependencies sections, code blocks, descriptions from meta tags, and proper error handling."

# Add build and development tools
claude-code "Create npm scripts for development, building, and publishing. Add a CLI entry point, development mode with tsx, and proper TypeScript compilation. Include watch mode for development."

# Generate documentation
claude-code "Create detailed README.md with installation instructions, usage examples, API documentation for all tools, and configuration examples for Claude Desktop integration."

# Set up for publishing
claude-code "Set up the project for npm publishing with proper package.json configuration, build outputs, executable permissions, and publishing scripts."
```

### Development and Debugging
```bash
# Debug issues
claude-code "Fix any TypeScript compilation errors and ensure all types are properly defined"

# Optimize performance  
claude-code "Add intelligent caching to store component information and optimize repeated requests"

# Test functionality
claude-code "Test the ReactBits.dev scraping with real HTTP requests and verify data extraction works correctly"

# Add features
claude-code "Add support for filtering components by animation type or complexity"
```

### Version Updates
```bash
# Update version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0  
npm version major  # 1.1.0 -> 2.0.0

# Rebuild and republish
npm run build
npm publish

# Update GitHub release
git push origin main --tags
```

### Monitoring and Support
```bash
# Check npm download stats
npm view reactbits-mcp-server

# Monitor issues
# Check GitHub issues regularly
# Monitor npm package health
```

_______________

CODe EXAMPLES:

#!/usr/bin/env node

/**
 * Example script showing how to use the ReactBits MCP Server
 * This is for demonstration purposes - in practice, you'd use this through an MCP client
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

class ReactBitsMCPExample {
  private serverProcess: any;
  private rl: any;

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🚀 ReactBits MCP Server Example');
    console.log('=====================================');
    console.log('This demonstrates the available tools:\n');

    await this.showExamples();
    
    console.log('\n✨ To use this in practice:');
    console.log('1. Configure the MCP server in your Claude Desktop config');
    console.log('2. Ask Claude questions like:');
    console.log('   - "Find React animation components"');
    console.log('   - "Get the split-text component code"');
    console.log('   - "Show me all background components"');
    console.log('   - "Give me a random text animation"');
    
    this.rl.close();
  }

  private async showExamples() {
    const examples = [
      {
        name: 'Search Components',
        description: 'Find components matching a query',
        tool: 'search_components',
        params: { query: 'text', limit: 3 },
        explanation: 'Searches for components containing "text" in their name or category'
      },
      {
        name: 'List Categories',
        description: 'Show all available component categories',
        tool: 'list_categories',
        params: {},
        explanation: 'Returns all categories with component counts and examples'
      },
      {
        name: 'Browse Category',
        description: 'Show all components in a category',
        tool: 'browse_category',
        params: { category: 'text-animations' },
        explanation: 'Lists all components in the text-animations category'
      },
      {
        name: 'Get Component Details',
        description: 'Fetch detailed component information',
        tool: 'get_component',
        params: { name: 'split-text', category: 'text-animations', includeCode: true },
        explanation: 'Gets complete details for the split-text component including code'
      },
      {
        name: 'Random Component',
        description: 'Get a random component for inspiration',
        tool: 'get_random_component',
        params: { category: 'backgrounds' },
        explanation: 'Returns a random component from the backgrounds category'
      }
    ];

    for (const example of examples) {
      console.log(`📋 ${example.name}`);
      console.log(`   ${example.description}`);
      console.log(`   Tool: ${example.tool}`);
      console.log(`   Params: ${JSON.stringify(example.params, null, 2)}`);
      console.log(`   Info: ${example.explanation}\n`);
    }
  }

  private simulateToolCall(toolName: string, params: any): any {
    // This simulates what the actual MCP server would return
    switch (toolName) {
      case 'search_components':
        return {
          query: params.query,
          category: params.category || 'all',
          resultsCount: 3,
          results: [
            { name: 'split-text', category: 'text-animations', url: 'https://reactbits.dev/text-animations/split-text' },
            { name: 'blur-text', category: 'text-animations', url: 'https://reactbits.dev/text-animations/blur-text' },
            { name: 'rotating-text', category: 'text-animations', url: 'https://reactbits.dev/text-animations/rotating-text' }
          ]
        };

      case 'list_categories':
        return {
          totalCategories: 9,
          categories: [
            { category: 'text-animations', componentCount: 6, components: ['split-text', 'blur-text', 'scroll-velocity'], hasMore: true },
            { category: 'backgrounds', componentCount: 9, components: ['beams', 'orb', 'particles'], hasMore: true },
            { category: 'components', componentCount: 12, components: ['button', 'hero-sections', 'tilted-card'], hasMore: true }
          ]
        };

      case 'get_component':
        return {
          name: 'split-text',
          category: 'text-animations',
          url: 'https://reactbits.dev/text-animations/split-text',
          description: 'Animate text by splitting it into individual characters with GSAP',
          props: [
            { property: 'text', type: 'string', default: '""', description: 'The text content to animate' },
            { property: 'delay', type: 'number', default: '100', description: 'Delay between animations for each letter (in ms)' },
            { property: 'duration', type: 'number', default: '0.6', description: 'Duration of each letter animation (in seconds)' }
          ],
          dependencies: ['gsap'],
          code: { typescript: '// Component code would be here...' }
        };

      default:
        return { error: 'Unknown tool' };
    }
  }
}

// Run the example
const example = new ReactBitsMCPExample();
example.start().catch(console.error);


______

implement these MCP servers.

{
  "mcpServers": {
    "MCP_DOCKER": {
      "command": "docker",
      "args": ["mcp", "gateway", "run"]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "env": {
        "ALLOW_DANGEROUS": "true"
      }
    },
    "magicui": {
      "command": "npx",
      "args": ["-y", "magicui-mcp"]
    },
    "mcp-server-playwright": {
      "command": "npx",
      "args": ["-y", "@smithery/cli@latest", "run", "@automatalabs/mcp-server-playwright"]
    },
    "mcp-server-firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-ed59b8834f974ba48790a928fb414e80",
        "FIRECRAWL_RETRY_MAX_ATTEMPTS": "5",
        "FIRECRAWL_RETRY_INITIAL_DELAY": "2000",
        "FIRECRAWL_RETRY_MAX_DELAY": "30000",
        "FIRECRAWL_RETRY_BACKOFF_FACTOR": "3",
        "FIRECRAWL_CREDIT_WARNING_THRESHOLD": "2000",
        "FIRECRAWL_CREDIT_CRITICAL_THRESHOLD": "500"
      }
    }
  }
}

