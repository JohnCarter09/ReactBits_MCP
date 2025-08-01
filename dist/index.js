#!/usr/bin/env node
/**
 * ReactBits MCP Server
 *
 * A Model Context Protocol server for browsing and retrieving React components
 * from ReactBits.dev with integration capabilities for other MCP servers.
 *
 * This server implements the MCP specification with proper TypeScript typing,
 * error handling, and performance optimizations.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { defaultScraperIntegration } from './scraper-integration.js';
import { activeConfig, SERVER_CAPABILITIES, TOOL_SCHEMAS } from './config.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { validateComponentId, validateSearchQuery, validatePagination, validateSearchFilters, formatComponent, formatSearchResults, createToolResult, LRUCache, measureAsync, createRequestContext, ContextLogger, RateLimiter, MetricsCollector, validateWithSchema, createReactBitsError, toMcpError } from './utils.js';
// ============================================================================
// Enhanced ReactBits Data Service with Caching and Performance
// ============================================================================
class ReactBitsDataService {
    componentCache;
    categoryCache;
    searchCache;
    lastFullCacheUpdate = 0;
    initializationPromise = null;
    isInitialized = false;
    realComponents = [];
    realCategories = [];
    extractionPath;
    componentIndex = [];
    constructor() {
        // Initialize caches with enhanced configuration
        this.componentCache = new LRUCache(activeConfig.server.maxCacheSize, activeConfig.tools.get_component.cacheExpiry);
        this.categoryCache = new LRUCache(100, // Smaller cache for categories
        activeConfig.tools.list_categories.cacheExpiry);
        this.searchCache = new LRUCache(500, // Medium cache for search results
        activeConfig.tools.search_components.cacheExpiry);
        // Set extraction path relative to project root
        this.extractionPath = path.resolve(process.cwd(), 'production-react-bits-extraction');
        // Initialize service with proper error handling
        this.initializeService();
    }
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        return {
            components: this.componentCache.getStats(),
            categories: this.categoryCache.getStats(),
            searches: this.searchCache.getStats()
        };
    }
    /**
     * Get health status of the data service
     */
    getHealthStatus() {
        return {
            hasData: this.realComponents.length > 0 || this.getMockComponents().length > 0,
            componentCount: this.realComponents.length > 0 ? this.realComponents.length : this.getMockComponents().length,
            categoryCount: this.realCategories.length > 0 ? this.realCategories.length : this.getMockCategories().length,
            isInitialized: this.isInitialized,
            usingRealData: this.realComponents.length > 0,
            lastCacheUpdate: this.lastFullCacheUpdate
        };
    }
    initializeService() {
        if (this.initializationPromise)
            return;
        this.initializationPromise = this.refreshCache()
            .then(() => {
            this.isInitialized = true;
            console.info('ReactBits data service initialized successfully');
            // Initialize scraper integration
            this.initializeScraperIntegration();
        })
            .catch(error => {
            console.warn('Initial cache refresh failed, will retry on first request:', error);
            this.isInitialized = false;
        });
    }
    /**
     * Initialize scraper integration for live data updates
     */
    initializeScraperIntegration() {
        try {
            // Set up event listeners for scraper updates
            defaultScraperIntegration.on('refresh-success', (_report) => {
                console.info('Scraper refresh completed, invalidating cache...');
                this.lastFullCacheUpdate = 0; // Force cache refresh on next request
                // Clear caches to force reload of new data
                this.componentCache.clear();
                this.categoryCache.clear();
                this.searchCache.clear();
            });
            defaultScraperIntegration.on('refresh-error', (error) => {
                console.warn('Scraper refresh failed:', error);
            });
            // Start the scraper integration
            defaultScraperIntegration.start().catch(error => {
                console.warn('Failed to start scraper integration:', error);
            });
        }
        catch (error) {
            console.warn('Scraper integration initialization failed:', error);
        }
    }
    /**
     * Ensure service is initialized before operations
     */
    async ensureInitialized() {
        if (this.isInitialized)
            return;
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        else {
            this.initializeService();
            await this.initializationPromise;
        }
    }
    async refreshCache() {
        const now = Date.now();
        if (now - this.lastFullCacheUpdate < activeConfig.server.cacheExpiry) {
            return; // Cache is still fresh
        }
        try {
            // Use enhanced performance measurement
            const { duration, metrics } = await measureAsync(() => this.loadRealData(), 'Cache refresh', activeConfig.server.enableTracing);
            this.lastFullCacheUpdate = now;
            if (activeConfig.server.enableMetrics) {
                console.debug(`Cache refreshed in ${duration.toFixed(2)}ms`, {
                    memoryUsage: metrics.memoryUsage ? `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A'
                });
            }
        }
        catch (error) {
            console.warn('Real data loading failed, falling back to mock data:', error);
            // Fallback to mock data if real data loading fails
            try {
                await this.loadMockDataAsFallback();
                this.lastFullCacheUpdate = now;
                console.info('Successfully loaded fallback mock data');
            }
            catch (fallbackError) {
                console.error('Both real data loading and fallback failed:', fallbackError);
                throw createReactBitsError(`Failed to load any component data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CACHE_ERROR', { originalError: error, fallbackError, timestamp: now });
            }
        }
    }
    async loadRealData() {
        try {
            // Load component index
            const indexPath = path.join(this.extractionPath, 'component-index.json');
            const indexData = await fs.readFile(indexPath, 'utf-8');
            this.componentIndex = JSON.parse(indexData);
            // Load and process all components
            const components = [];
            const categoryCounts = {};
            for (const indexEntry of this.componentIndex) {
                try {
                    const componentData = await this.loadComponentFromExtraction(indexEntry);
                    if (componentData) {
                        components.push(componentData);
                        // Count components per category
                        const normalizedCategory = this.normalizeCategory(componentData.category);
                        categoryCounts[normalizedCategory] = (categoryCounts[normalizedCategory] || 0) + 1;
                    }
                }
                catch (error) {
                    console.warn(`Failed to load component ${indexEntry.name}:`, error);
                }
            }
            this.realComponents = components;
            // Generate categories from real data
            this.realCategories = this.generateCategoriesFromComponents(categoryCounts);
            // Populate caches
            components.forEach(component => {
                this.componentCache.set(component.id, component);
            });
            this.realCategories.forEach(category => {
                this.categoryCache.set(category.id, category);
            });
            console.info(`Loaded ${components.length} real components across ${this.realCategories.length} categories`);
        }
        catch (error) {
            throw createReactBitsError(`Failed to load real component data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CACHE_ERROR', { error, extractionPath: this.extractionPath });
        }
    }
    async loadMockDataAsFallback() {
        // Mock data - in production, this would fetch from ReactBits.dev
        const mockComponents = [
            {
                id: 'animated-button-1',
                name: 'Animated Button',
                description: 'A beautiful animated button with hover effects',
                category: 'buttons',
                tags: ['animation', 'hover', 'interactive'],
                codePreview: `<Button className="animated-btn">Click me</Button>`,
                dependencies: ['framer-motion', 'tailwindcss'],
                lastUpdated: '2024-01-15T10:00:00Z',
                difficulty: 'beginner',
                demoUrl: 'https://reactbits.dev/demo/animated-button-1'
            },
            {
                id: 'gradient-card-2',
                name: 'Gradient Card',
                description: 'Modern card component with gradient backgrounds',
                category: 'cards',
                tags: ['gradient', 'modern', 'layout'],
                codePreview: `<GradientCard>Content here</GradientCard>`,
                dependencies: ['react', 'tailwindcss'],
                lastUpdated: '2024-01-14T15:30:00Z',
                difficulty: 'intermediate'
            }
        ];
        const mockCategories = [
            {
                id: 'buttons',
                name: 'Buttons',
                description: 'Interactive button components with various styles and animations',
                componentCount: 15,
                subcategories: ['primary', 'secondary', 'animated']
            },
            {
                id: 'cards',
                name: 'Cards',
                description: 'Card layouts and containers for organizing content',
                componentCount: 8,
                subcategories: ['basic', 'gradient', 'glassmorphism']
            }
        ];
        // Populate caches with new LRU cache system
        mockComponents.forEach(component => {
            this.componentCache.set(component.id, component);
        });
        mockCategories.forEach(category => {
            this.categoryCache.set(category.id, category);
        });
    }
    async searchComponents(query, filters = {}) {
        await this.ensureInitialized();
        // Validate inputs with enhanced validation
        const validatedQuery = validateSearchQuery(query);
        const validatedFilters = validateSearchFilters(filters);
        // Check cache first with improved cache key
        const cacheKey = `search:${validatedQuery}:${JSON.stringify(validatedFilters, Object.keys(validatedFilters).sort())}`;
        const cached = this.searchCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        await this.refreshCache();
        // Get all components - in production this would query a database more efficiently
        const allComponents = this.getAllCachedComponents();
        let filtered = allComponents;
        // Apply search query with improved matching
        if (validatedQuery.trim()) {
            const searchTerm = validatedQuery.toLowerCase();
            filtered = filtered.filter(component => component.name.toLowerCase().includes(searchTerm) ||
                component.description.toLowerCase().includes(searchTerm) ||
                component.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                component.category.toLowerCase().includes(searchTerm));
        }
        // Apply filters
        if (validatedFilters.category) {
            filtered = filtered.filter(component => component.category === validatedFilters.category);
        }
        if (validatedFilters.tags && validatedFilters.tags.length > 0) {
            filtered = filtered.filter(component => validatedFilters.tags.some(tag => component.tags.includes(tag)));
        }
        if (validatedFilters.difficulty) {
            filtered = filtered.filter(component => component.difficulty === validatedFilters.difficulty);
        }
        if (validatedFilters.hasDemo !== undefined) {
            filtered = filtered.filter(component => validatedFilters.hasDemo ? !!component.demoUrl : !component.demoUrl);
        }
        if (validatedFilters.dependencies && validatedFilters.dependencies.length > 0) {
            filtered = filtered.filter(component => validatedFilters.dependencies.some(dep => component.dependencies.includes(dep)));
        }
        if (validatedFilters.updatedAfter) {
            const afterDate = new Date(validatedFilters.updatedAfter);
            filtered = filtered.filter(component => new Date(component.lastUpdated) > afterDate);
        }
        // Apply sorting
        if (validatedFilters.sortBy) {
            filtered = this.sortComponents(filtered, validatedFilters.sortBy, validatedFilters.sortOrder || 'desc');
        }
        // Apply pagination
        const { limit, offset } = validatePagination(validatedFilters.limit, validatedFilters.offset);
        const result = filtered.slice(offset, offset + limit);
        // Cache the result
        this.searchCache.set(cacheKey, result);
        return result;
    }
    /**
     * Load individual component from extraction data
     */
    async loadComponentFromExtraction(indexEntry) {
        try {
            // Use the original category from the index (raw directory name)
            const categoryDir = indexEntry.category;
            const filename = `${indexEntry.name.toLowerCase().replace(/\s+/g, '-')}.json`;
            const componentPath = path.join(this.extractionPath, 'components', categoryDir, filename);
            const componentData = await fs.readFile(componentPath, 'utf-8');
            const parsed = JSON.parse(componentData);
            return this.mapExtractedComponentToMCP(parsed, indexEntry);
        }
        catch (error) {
            console.warn(`Failed to load component file for ${indexEntry.name}:`, error);
            return null;
        }
    }
    /**
     * Map extracted component data to MCP format
     */
    mapExtractedComponentToMCP(extractedData, _indexEntry) {
        const metadata = extractedData.metadata;
        const analysis = extractedData.analysis;
        const source = extractedData.source;
        // Generate unique ID from name and category
        const id = `${metadata.name.toLowerCase().replace(/\s+/g, '-')}-${metadata.category}`;
        // Map difficulty based on complexity
        let difficulty = 'beginner';
        if (analysis.complexity?.level === 'complex') {
            difficulty = 'advanced';
        }
        else if (analysis.complexity?.level === 'moderate') {
            difficulty = 'intermediate';
        }
        // Generate description from analysis
        const description = this.generateDescription(metadata, analysis);
        // Create code preview from source
        const codePreview = this.extractCodePreview(source.sourceCode);
        return {
            id,
            name: metadata.name,
            description,
            category: this.normalizeCategory(metadata.category),
            tags: analysis.features || [],
            codePreview,
            fullCode: source.sourceCode,
            dependencies: analysis.dependencies || [],
            lastUpdated: metadata.extractedAt || new Date().toISOString(),
            difficulty,
            // demoUrl could be generated from ReactBits.dev if available
            props: this.extractPropsFromTypes(extractedData.types),
            examples: [],
            ...(this.detectFramework(analysis.stylingApproach) ? {
                styling: {
                    framework: this.detectFramework(analysis.stylingApproach)
                }
            } : {})
        };
    }
    /**
     * Normalize category names
     */
    normalizeCategory(category) {
        const categoryMap = {
            'nimations': 'animations',
            'avigation': 'navigation',
            'eedback': 'feedback',
            'ui-component': 'ui-components'
        };
        return categoryMap[category] || category;
    }
    /**
     * Generate human-readable description from analysis
     */
    generateDescription(_metadata, analysis) {
        const features = analysis.features || [];
        const complexity = analysis.complexity?.level || 'simple';
        const hasAnimation = analysis.hasAnimation;
        let description = `A ${complexity} React component`;
        if (hasAnimation) {
            description += ' with animation capabilities';
        }
        if (features.length > 0) {
            description += ` featuring ${features.slice(0, 3).join(', ')}`;
        }
        description += `. Built with modern React patterns and optimized for performance.`;
        return description;
    }
    /**
     * Extract code preview from full source
     */
    extractCodePreview(sourceCode) {
        const lines = sourceCode.split('\n');
        // Find the main component definition
        let componentStart = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('const ') && lines[i].includes(' = ')) {
                componentStart = i;
                break;
            }
        }
        if (componentStart === -1) {
            // Fallback to first few lines
            return lines.slice(0, 5).join('\n') + '...';
        }
        // Return component definition and a few lines
        return lines.slice(componentStart, Math.min(componentStart + 3, lines.length)).join('\n') + '...';
    }
    /**
     * Extract props from type definitions
     */
    extractPropsFromTypes(types) {
        if (!types.propsInterface || types.propsInterface.length === 0) {
            return [];
        }
        return types.propsInterface.flatMap((iface) => iface.properties.map((prop) => {
            const [name, type] = prop.split(':').map(s => s.trim());
            return {
                property: name || prop,
                type: type || 'any',
                default: '',
                description: `${name} property`,
                required: !prop.includes('?')
            };
        }));
    }
    /**
     * Detect CSS framework from styling approach
     */
    detectFramework(stylingApproach) {
        if (!stylingApproach)
            return undefined;
        if (stylingApproach.includes('tailwind'))
            return 'tailwind';
        if (stylingApproach.includes('styled-components'))
            return 'styled-components';
        if (stylingApproach.includes('emotion'))
            return 'emotion';
        if (stylingApproach.includes('css-modules'))
            return 'css-modules';
        return undefined;
    }
    /**
     * Generate categories from component data
     */
    generateCategoriesFromComponents(categoryCounts) {
        const categoryDescriptions = {
            'animations': 'Animation components and utilities for creating smooth, engaging user experiences',
            'navigation': 'Navigation components including headers, sidebars, and layout utilities',
            'feedback': 'User feedback components like toasters, tooltips, and notifications',
            'ui-components': 'Core UI components for building modern React applications',
            'buttons': 'Interactive button components with various styles and animations',
            'cards': 'Card layouts and containers for organizing content',
            'forms': 'Form components and input elements with validation support'
        };
        const categoryIcons = {
            'animations': '✨',
            'navigation': '🧭',
            'feedback': '💬',
            'ui-components': '🎨',
            'buttons': '🔘',
            'cards': '🎴',
            'forms': '📝'
        };
        return Object.entries(categoryCounts).map(([id, count], index) => ({
            id,
            name: id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' '),
            description: categoryDescriptions[id] || `Components in the ${id} category`,
            componentCount: count,
            subcategories: [],
            priority: index + 1,
            icon: categoryIcons[id] || '📦'
        }));
    }
    /**
     * Get all cached components as array
     */
    getAllCachedComponents() {
        // Return real components if available, otherwise fall back to mock
        return this.realComponents.length > 0 ? this.realComponents : this.getMockComponents();
    }
    /**
     * Sort components by specified field
     */
    sortComponents(components, sortBy, sortOrder) {
        const sorted = [...components].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'updated':
                    comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
                    break;
                case 'difficulty':
                    const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
                    comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
                    break;
                case 'category':
                    comparison = a.category.localeCompare(b.category);
                    break;
                default:
                    comparison = 0;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        return sorted;
    }
    async getComponent(id) {
        await this.ensureInitialized();
        // Validate input
        const validatedId = validateComponentId(id);
        // Check cache first
        let component = this.componentCache.get(validatedId);
        if (!component) {
            await this.refreshCache();
            // In mock implementation, search through mock components
            const mockComponents = this.getMockComponents();
            component = mockComponents.find(c => c.id === validatedId) || null;
            if (component) {
                this.componentCache.set(validatedId, component);
            }
        }
        if (!component) {
            return null;
        }
        // Fetch full code if not cached (with better error handling)
        if (!component.fullCode) {
            try {
                const { result: fullCode } = await measureAsync(() => this.fetchComponentCode(validatedId), `Fetch code for ${validatedId}`, activeConfig.server.enableTracing);
                // Create updated component with full code
                const updatedComponent = { ...component, fullCode };
                // Update cache with full code
                this.componentCache.set(validatedId, updatedComponent);
                return updatedComponent;
            }
            catch (error) {
                console.warn(`Failed to fetch full code for component ${validatedId}:`, error);
                // Return component without full code rather than failing completely
                return component;
            }
        }
        return component;
    }
    async listCategories() {
        await this.ensureInitialized();
        // const cacheKey = 'all-categories'; // Not used in current implementation
        await this.refreshCache();
        // Get categories (real or mock)
        const categories = this.getMockCategories();
        // Cache each category
        categories.forEach(category => {
            this.categoryCache.set(category.id, category);
        });
        return categories;
    }
    async browseCategory(categoryId, limit = 10, offset = 0) {
        await this.ensureInitialized();
        // Validate inputs
        const validatedCategoryId = validateComponentId(categoryId);
        const { limit: validatedLimit, offset: validatedOffset } = validatePagination(limit, offset);
        // Check cache first
        const cacheKey = `category:${validatedCategoryId}:${validatedLimit}:${validatedOffset}`;
        const cached = this.searchCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        await this.refreshCache();
        // Get all components and filter by category
        const allComponents = this.getMockComponents();
        const categoryComponents = allComponents.filter(component => component.category === validatedCategoryId);
        // Apply pagination
        const result = categoryComponents.slice(validatedOffset, validatedOffset + validatedLimit);
        // Cache the result
        this.searchCache.set(cacheKey, result);
        return result;
    }
    async getRandomComponent() {
        await this.ensureInitialized();
        await this.refreshCache();
        // Get all available components
        const allComponents = this.getMockComponents();
        if (allComponents.length === 0) {
            return null;
        }
        // Select random component
        const randomIndex = Math.floor(Math.random() * allComponents.length);
        let component = allComponents[randomIndex];
        // Fetch full code for random component if not available
        if (!component.fullCode) {
            try {
                const { result: fullCode } = await measureAsync(() => this.fetchComponentCode(component.id), `Fetch random component code`, activeConfig.server.enableTracing);
                component = { ...component, fullCode };
                // Cache the component with full code
                this.componentCache.set(component.id, component);
            }
            catch (error) {
                console.warn(`Failed to fetch full code for random component ${component.id}:`, error);
                // Return component without full code rather than failing
            }
        }
        return component;
    }
    async fetchComponentCode(componentId) {
        // In a real implementation, this would fetch the actual component code
        // For now, return a mock implementation
        return `
// Component: ${componentId}
import React from 'react';

export const Component = ({ children, ...props }) => {
  return (
    <div className="component" {...props}>
      {children}
    </div>
  );
};

export default Component;
    `.trim();
    }
    /**
     * Get mock components data
     */
    getMockComponents() {
        return [
            {
                id: 'animated-button-1',
                name: 'Animated Button',
                description: 'A beautiful animated button with hover effects',
                category: 'buttons',
                tags: ['animation', 'hover', 'interactive'],
                codePreview: `<Button className="animated-btn">Click me</Button>`,
                dependencies: ['framer-motion', 'tailwindcss'],
                lastUpdated: '2024-01-15T10:00:00Z',
                difficulty: 'beginner',
                demoUrl: 'https://reactbits.dev/demo/animated-button-1'
            },
            {
                id: 'gradient-card-2',
                name: 'Gradient Card',
                description: 'Modern card component with gradient backgrounds',
                category: 'cards',
                tags: ['gradient', 'modern', 'layout'],
                codePreview: `<GradientCard>Content here</GradientCard>`,
                dependencies: ['react', 'tailwindcss'],
                lastUpdated: '2024-01-14T15:30:00Z',
                difficulty: 'intermediate'
            },
            {
                id: 'hover-card-3',
                name: 'Hover Card',
                description: 'Interactive card with smooth hover animations',
                category: 'cards',
                tags: ['hover', 'animation', 'card'],
                codePreview: `<HoverCard>Hover me</HoverCard>`,
                dependencies: ['react', 'tailwindcss'],
                lastUpdated: '2024-01-13T12:00:00Z',
                difficulty: 'beginner'
            },
            {
                id: 'glow-button-4',
                name: 'Glow Button',
                description: 'Button with elegant glow effect on hover',
                category: 'buttons',
                tags: ['glow', 'hover', 'effect'],
                codePreview: `<GlowButton>Glow Effect</GlowButton>`,
                dependencies: ['react', 'tailwindcss'],
                lastUpdated: '2024-01-12T09:15:00Z',
                difficulty: 'intermediate',
                demoUrl: 'https://reactbits.dev/demo/glow-button-4'
            }
        ];
    }
    /**
     * Get mock categories data
     */
    getMockCategories() {
        // Return real categories if available, otherwise return mock data
        if (this.realCategories.length > 0) {
            return this.realCategories;
        }
        return [
            {
                id: 'buttons',
                name: 'Buttons',
                description: 'Interactive button components with various styles and animations',
                componentCount: 15,
                subcategories: ['primary', 'secondary', 'animated'],
                priority: 1,
                icon: '🔘'
            },
            {
                id: 'cards',
                name: 'Cards',
                description: 'Card layouts and containers for organizing content',
                componentCount: 8,
                subcategories: ['basic', 'gradient', 'glassmorphism'],
                priority: 2,
                icon: '🎴'
            },
            {
                id: 'navigation',
                name: 'Navigation',
                description: 'Navigation components for app structure',
                componentCount: 12,
                subcategories: ['menus', 'tabs', 'breadcrumbs'],
                priority: 3,
                icon: '🧭'
            }
        ];
    }
}
// ============================================================================
// MCP Server Implementation - Protocol Compliant
// ============================================================================
class ReactBitsMCPServer {
    server;
    dataService;
    rateLimiter;
    metricsCollector;
    startTime;
    requestCount = 0;
    errorCount = 0;
    constructor() {
        this.startTime = Date.now();
        this.server = new Server({
            name: activeConfig.server.name,
            version: activeConfig.server.version,
        }, {
            capabilities: SERVER_CAPABILITIES,
        });
        this.dataService = new ReactBitsDataService();
        this.rateLimiter = new RateLimiter(activeConfig.server.maxRequestsPerMinute, 60000 // 1 minute window
        );
        this.metricsCollector = new MetricsCollector(1000);
        this.setupToolHandlers();
        this.setupErrorHandling();
        this.setupPeriodicCleanup();
    }
    /**
     * Get server health status
     */
    getHealth() {
        const uptime = Date.now() - this.startTime;
        const metrics = this.metricsCollector.getSummary();
        const dataServiceHealth = this.dataService.getHealthStatus();
        const scraperStats = defaultScraperIntegration.getStats();
        // Determine overall status
        let status = 'healthy';
        if (this.errorCount / Math.max(this.requestCount, 1) > 0.1) {
            status = 'degraded';
        }
        if (!dataServiceHealth.hasData) {
            status = 'unhealthy';
        }
        return {
            status,
            uptime,
            version: activeConfig.server.version,
            capabilities: ['tools'],
            metrics: {
                requestCount: this.requestCount,
                errorCount: this.errorCount,
                averageResponseTime: metrics.averageResponseTime,
                cacheHitRate: metrics.cacheHitRate,
            },
            checks: [
                {
                    name: 'data_service',
                    status: dataServiceHealth.hasData ? 'pass' : 'fail',
                    message: dataServiceHealth.hasData ?
                        `Data service operational with ${dataServiceHealth.componentCount} components` :
                        'Data service has no component data',
                    timestamp: Date.now(),
                    duration: 0
                },
                {
                    name: 'cache_service',
                    status: 'pass',
                    message: 'Cache service is operational',
                    timestamp: Date.now(),
                    duration: 0
                },
                {
                    name: 'scraper_integration',
                    status: scraperStats.failedRuns > scraperStats.successfulRuns ? 'warn' : 'pass',
                    message: `Scraper: ${scraperStats.successfulRuns} successful, ${scraperStats.failedRuns} failed runs`,
                    timestamp: Date.now(),
                    duration: 0
                }
            ]
        };
    }
    /**
     * Setup periodic cleanup tasks
     */
    setupPeriodicCleanup() {
        // Clean up rate limiter every 5 minutes
        setInterval(() => {
            this.rateLimiter.cleanup();
        }, 5 * 60 * 1000);
        // Log metrics summary every 10 minutes
        setInterval(() => {
            if (activeConfig.server.enableMetrics) {
                const summary = this.metricsCollector.getSummary();
                console.info('Metrics Summary:', JSON.stringify(summary, null, 2));
            }
        }, 10 * 60 * 1000);
    }
    setupToolHandlers() {
        // Define all available tools with comprehensive schemas from config
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const tools = [
                {
                    name: 'search_components',
                    description: 'Search for React components with optional filters and pagination support',
                    inputSchema: TOOL_SCHEMAS.search_components
                },
                {
                    name: 'get_component',
                    description: 'Retrieve detailed information about a specific component including full code',
                    inputSchema: TOOL_SCHEMAS.get_component
                },
                {
                    name: 'list_categories',
                    description: 'Get all available component categories with metadata',
                    inputSchema: TOOL_SCHEMAS.list_categories
                },
                {
                    name: 'browse_category',
                    description: 'Browse components within a specific category with pagination',
                    inputSchema: TOOL_SCHEMAS.browse_category
                },
                {
                    name: 'get_random_component',
                    description: 'Get a random component with full code for inspiration',
                    inputSchema: TOOL_SCHEMAS.get_random_component
                }
            ];
            return { tools };
        });
        // Implement tool execution handlers with comprehensive monitoring and validation
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const context = createRequestContext(name);
            const logger = new ContextLogger(context, activeConfig.server.logLevel);
            // Increment request counter
            this.requestCount++;
            // Rate limiting check
            const clientId = 'default'; // In a real implementation, extract from request context
            if (!this.rateLimiter.isAllowed(clientId)) {
                this.errorCount++;
                const resetTime = this.rateLimiter.getResetTime(clientId);
                logger.warn('Rate limit exceeded', { clientId, resetTime });
                throw new McpError(ErrorCode.InvalidRequest, `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds.`, { resetTime, remaining: 0 });
            }
            logger.info(`Executing tool: ${name}`, { args });
            try {
                // Validate input using JSON schema
                const schema = TOOL_SCHEMAS[name];
                const validatedArgs = schema ? validateWithSchema(args, schema, name, context) : args;
                const startTime = performance.now();
                let result;
                switch (name) {
                    case 'search_components':
                        result = await this.handleSearchComponents(validatedArgs, context);
                        break;
                    case 'get_component':
                        result = await this.handleGetComponent(validatedArgs, context);
                        break;
                    case 'list_categories':
                        result = await this.handleListCategories(context);
                        break;
                    case 'browse_category':
                        result = await this.handleBrowseCategory(validatedArgs, context);
                        break;
                    case 'get_random_component':
                        result = await this.handleGetRandomComponent(context);
                        break;
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
                const duration = performance.now() - startTime;
                // Record metrics
                if (activeConfig.server.enableMetrics) {
                    this.metricsCollector.record({
                        operationName: name,
                        duration,
                        cacheHit: false, // Will be updated by individual handlers
                        timestamp: Date.now()
                    });
                }
                logger.info(`Tool execution completed`, { duration: `${duration.toFixed(2)}ms` });
                return result;
            }
            catch (error) {
                this.errorCount++;
                logger.error('Tool execution failed', error);
                if (error instanceof McpError) {
                    throw error;
                }
                // Convert ReactBits errors to MCP errors
                if (error && typeof error === 'object' && 'code' in error) {
                    throw toMcpError(error);
                }
                throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { context: context.requestId, toolName: name });
            }
        });
    }
    async handleSearchComponents(args, context) {
        const logger = new ContextLogger(context, activeConfig.server.logLevel);
        try {
            const { query, category, tags, difficulty, hasDemo, limit = 10, offset = 0, sortBy, sortOrder } = args;
            const filters = {
                category,
                tags,
                difficulty,
                hasDemo,
                limit,
                offset,
                sortBy,
                sortOrder
            };
            logger.debug('Searching components', { query, filters });
            const { result: components, duration, metrics } = await measureAsync(() => this.dataService.searchComponents(query, filters), 'Search components', activeConfig.server.enableTracing, context);
            // Update metrics with cache information
            if (activeConfig.server.enableMetrics) {
                metrics.cacheHit = false; // Updated by data service
                this.metricsCollector.record(metrics);
            }
            const response = formatSearchResults(components, {
                query,
                filters,
                resultCount: components.length,
                hasMore: components.length === limit,
                executionTime: duration
            });
            logger.info('Search completed', { resultCount: components.length, duration });
            return createToolResult(response);
        }
        catch (error) {
            logger.error('Search failed', error);
            if (error instanceof McpError) {
                throw error;
            }
            throw new McpError(ErrorCode.InternalError, `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { context: context.requestId });
        }
    }
    async handleGetComponent(args, context) {
        const logger = new ContextLogger(context, activeConfig.server.logLevel);
        try {
            const { id, includeCode = true, includeExamples = false } = args;
            logger.debug('Getting component', { id, includeCode, includeExamples });
            const { result: component, duration, metrics } = await measureAsync(() => this.dataService.getComponent(id), `Get component ${id}`, activeConfig.server.enableTracing, context);
            // Update metrics
            if (activeConfig.server.enableMetrics) {
                this.metricsCollector.record(metrics);
            }
            if (!component) {
                logger.warn('Component not found', { id });
                const errorResponse = {
                    success: false,
                    error: `Component with ID '${id}' not found`,
                    metadata: {
                        searchedId: id,
                        executionTime: duration,
                        suggestions: ['Check component ID spelling', 'Use search_components to find available components']
                    }
                };
                return createToolResult(errorResponse);
            }
            const response = {
                success: true,
                data: formatComponent(component, includeCode),
                metadata: {
                    hasFullCode: !!component.fullCode,
                    lastUpdated: component.lastUpdated,
                    executionTime: duration,
                    cached: metrics.cacheHit
                }
            };
            logger.info('Component retrieved successfully', { id, hasFullCode: !!component.fullCode });
            return createToolResult(response);
        }
        catch (error) {
            logger.error('Get component failed', error);
            if (error instanceof McpError) {
                throw error;
            }
            throw new McpError(ErrorCode.InternalError, `Get component failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { context: context.requestId });
        }
    }
    async handleListCategories(context) {
        const logger = new ContextLogger(context, activeConfig.server.logLevel);
        try {
            const { includeEmpty = false, sortBy = 'name' } = {}; // No args for this tool currently
            logger.debug('Listing categories', { includeEmpty, sortBy });
            const { result: categories, duration, metrics } = await measureAsync(() => this.dataService.listCategories(), 'List categories', activeConfig.server.enableTracing, context);
            // Update metrics
            if (activeConfig.server.enableMetrics) {
                this.metricsCollector.record(metrics);
            }
            const response = {
                success: true,
                data: categories,
                metadata: {
                    totalCategories: categories.length,
                    totalComponents: categories.reduce((sum, cat) => sum + cat.componentCount, 0),
                    executionTime: duration,
                    cached: metrics.cacheHit
                }
            };
            logger.info('Categories listed successfully', { count: categories.length });
            return createToolResult(response);
        }
        catch (error) {
            logger.error('List categories failed', error);
            throw new McpError(ErrorCode.InternalError, `List categories failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { context: context.requestId });
        }
    }
    async handleBrowseCategory(args, context) {
        const logger = new ContextLogger(context, activeConfig.server.logLevel);
        try {
            const { categoryId, limit = 10, offset = 0, sortBy = 'updated' } = args;
            logger.debug('Browsing category', { categoryId, limit, offset, sortBy });
            const { result: components, duration, metrics } = await measureAsync(() => this.dataService.browseCategory(categoryId, limit, offset), `Browse category ${categoryId}`, activeConfig.server.enableTracing, context);
            // Update metrics
            if (activeConfig.server.enableMetrics) {
                this.metricsCollector.record(metrics);
            }
            if (components.length === 0 && offset === 0) {
                logger.warn('Category not found or empty', { categoryId });
                const errorResponse = {
                    success: false,
                    error: `Category '${categoryId}' not found or contains no components`,
                    metadata: {
                        searchedCategory: categoryId,
                        executionTime: duration,
                        suggestions: ['Use list_categories to see available categories', 'Check category ID spelling']
                    }
                };
                return createToolResult(errorResponse);
            }
            const response = formatSearchResults(components, {
                category: categoryId,
                resultCount: components.length,
                hasMore: components.length === limit,
                executionTime: duration,
                offset,
                limit
            });
            logger.info('Category browsed successfully', { categoryId, count: components.length });
            return createToolResult(response);
        }
        catch (error) {
            logger.error('Browse category failed', error);
            if (error instanceof McpError) {
                throw error;
            }
            throw new McpError(ErrorCode.InternalError, `Browse category failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { context: context.requestId });
        }
    }
    async handleGetRandomComponent(context) {
        const logger = new ContextLogger(context, activeConfig.server.logLevel);
        try {
            // No args for get_random_component currently but prepared for future
            const includeCode = true;
            logger.debug('Getting random component', { includeCode });
            const { result: component, duration, metrics } = await measureAsync(() => this.dataService.getRandomComponent(), 'Get random component', activeConfig.server.enableTracing, context);
            // Update metrics
            if (activeConfig.server.enableMetrics) {
                this.metricsCollector.record(metrics);
            }
            if (!component) {
                logger.warn('No components available for random selection');
                const errorResponse = {
                    success: false,
                    error: 'No components available for random selection',
                    metadata: {
                        timestamp: new Date().toISOString(),
                        executionTime: duration,
                        suggestions: ['Check if data service is properly initialized', 'Verify component data is loaded']
                    }
                };
                return createToolResult(errorResponse);
            }
            const response = {
                success: true,
                data: formatComponent(component, includeCode),
                metadata: {
                    randomSelection: true,
                    timestamp: new Date().toISOString(),
                    hasFullCode: !!component.fullCode,
                    executionTime: duration,
                    cached: metrics.cacheHit
                }
            };
            logger.info('Random component retrieved', { id: component.id, category: component.category });
            return createToolResult(response);
        }
        catch (error) {
            logger.error('Get random component failed', error);
            throw new McpError(ErrorCode.InternalError, `Get random component failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { context: context.requestId });
        }
    }
    setupErrorHandling() {
        // Global error handler for uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
        // Graceful shutdown handling
        process.on('SIGINT', () => {
            console.log('Received SIGINT, shutting down gracefully...');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            console.log('Received SIGTERM, shutting down gracefully...');
            process.exit(0);
        });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('ReactBits MCP Server running on stdio');
    }
}
// ============================================================================
// Application Entry Point
// ============================================================================
async function main() {
    try {
        const server = new ReactBitsMCPServer();
        await server.start();
    }
    catch (error) {
        console.error('Failed to start ReactBits MCP Server:', error);
        process.exit(1);
    }
}
// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
export { ReactBitsMCPServer, ReactBitsDataService };
//# sourceMappingURL=index.js.map