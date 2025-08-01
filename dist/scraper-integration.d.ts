/**
 * ReactBits Scraper Integration Service
 *
 * Integrates the production scraper with the MCP server for live data updates
 * and background refresh capabilities while maintaining performance and
 * respecting ReactBits.dev rate limits.
 */
import { EventEmitter } from 'events';
interface ScraperConfig {
    enabled: boolean;
    refreshInterval: number;
    maxConcurrent: number;
    requestDelay: number;
    retryAttempts: number;
    outputDir: string;
}
interface ScraperStats {
    lastRun: number;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    componentsScraped: number;
    lastError?: string;
}
export declare class ReactBitsScraperIntegration extends EventEmitter {
    private config;
    private stats;
    private isRunning;
    private intervalId?;
    private scraperPath;
    constructor(config?: Partial<ScraperConfig>);
    /**
     * Start the scraper integration service
     */
    start(): Promise<void>;
    /**
     * Stop the scraper integration service
     */
    stop(): void;
    /**
     * Manually trigger a data refresh
     */
    refreshData(): Promise<boolean>;
    /**
     * Check if data needs refreshing
     */
    private shouldRefreshData;
    /**
     * Check if extraction data exists
     */
    private checkExtractionExists;
    /**
     * Schedule the next refresh
     */
    private scheduleNextRefresh;
    /**
     * Get scraper statistics
     */
    getStats(): ScraperStats;
    /**
     * Get scraper configuration
     */
    getConfig(): ScraperConfig;
    /**
     * Update scraper configuration
     */
    updateConfig(updates: Partial<ScraperConfig>): void;
    /**
     * Check if scraper is currently running
     */
    isScraperRunning(): boolean;
    /**
     * Get time until next scheduled refresh
     */
    getTimeUntilNextRefresh(): number;
}
/**
 * Default scraper integration instance
 */
export declare const defaultScraperIntegration: ReactBitsScraperIntegration;
export {};
//# sourceMappingURL=scraper-integration.d.ts.map