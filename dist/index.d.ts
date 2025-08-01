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
import type { ReactBitsComponent, ReactBitsCategory, SearchFilters, ToolResponse, ServerHealth } from './types.js';
declare class ReactBitsDataService {
    private componentCache;
    private categoryCache;
    private searchCache;
    private lastFullCacheUpdate;
    private initializationPromise;
    private isInitialized;
    private realComponents;
    private realCategories;
    private extractionPath;
    private componentIndex;
    constructor();
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats(): {
        components: {
            size: number;
            maxSize: number;
            hitCount: number;
            missCount: number;
            hitRate: number;
            evictionCount: number;
        };
        categories: {
            size: number;
            maxSize: number;
            hitCount: number;
            missCount: number;
            hitRate: number;
            evictionCount: number;
        };
        searches: {
            size: number;
            maxSize: number;
            hitCount: number;
            missCount: number;
            hitRate: number;
            evictionCount: number;
        };
    };
    /**
     * Get health status of the data service
     */
    getHealthStatus(): {
        hasData: boolean;
        componentCount: number;
        categoryCount: number;
        isInitialized: boolean;
        usingRealData: boolean;
        lastCacheUpdate: number;
    };
    private initializeService;
    /**
     * Initialize scraper integration for live data updates
     */
    private initializeScraperIntegration;
    /**
     * Ensure service is initialized before operations
     */
    private ensureInitialized;
    private refreshCache;
    private loadRealData;
    private loadMockDataAsFallback;
    searchComponents(query: string, filters?: SearchFilters): Promise<ReactBitsComponent[]>;
    /**
     * Load individual component from extraction data
     */
    private loadComponentFromExtraction;
    /**
     * Map extracted component data to MCP format
     */
    private mapExtractedComponentToMCP;
    /**
     * Normalize category names
     */
    private normalizeCategory;
    /**
     * Generate human-readable description from analysis
     */
    private generateDescription;
    /**
     * Extract code preview from full source
     */
    private extractCodePreview;
    /**
     * Extract props from type definitions
     */
    private extractPropsFromTypes;
    /**
     * Detect CSS framework from styling approach
     */
    private detectFramework;
    /**
     * Generate categories from component data
     */
    private generateCategoriesFromComponents;
    /**
     * Get all cached components as array
     */
    private getAllCachedComponents;
    /**
     * Sort components by specified field
     */
    private sortComponents;
    getComponent(id: string): Promise<ReactBitsComponent | null>;
    listCategories(): Promise<ReactBitsCategory[]>;
    browseCategory(categoryId: string, limit?: number, offset?: number): Promise<ReactBitsComponent[]>;
    getRandomComponent(): Promise<ReactBitsComponent | null>;
    private fetchComponentCode;
    /**
     * Get mock components data
     */
    private getMockComponents;
    /**
     * Get mock categories data
     */
    private getMockCategories;
}
declare class ReactBitsMCPServer {
    private server;
    private dataService;
    private rateLimiter;
    private metricsCollector;
    private startTime;
    private requestCount;
    private errorCount;
    constructor();
    /**
     * Get server health status
     */
    getHealth(): ServerHealth;
    /**
     * Setup periodic cleanup tasks
     */
    private setupPeriodicCleanup;
    private setupToolHandlers;
    private handleSearchComponents;
    private handleGetComponent;
    private handleListCategories;
    private handleBrowseCategory;
    private handleGetRandomComponent;
    private setupErrorHandling;
    start(): Promise<void>;
}
export { ReactBitsMCPServer, ReactBitsDataService };
export type { ReactBitsComponent, ReactBitsCategory, SearchFilters, ToolResponse };
//# sourceMappingURL=index.d.ts.map