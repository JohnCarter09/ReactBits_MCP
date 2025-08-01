/**
 * ReactBits Scraper Integration Service
 * 
 * Integrates the production scraper with the MCP server for live data updates
 * and background refresh capabilities while maintaining performance and
 * respecting ReactBits.dev rate limits.
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';
// import type { ReactBitsComponent, ReactBitsCategory } from './types.js';

interface ScraperConfig {
  enabled: boolean;
  refreshInterval: number; // milliseconds
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

export class ReactBitsScraperIntegration extends EventEmitter {
  private config: ScraperConfig;
  private stats: ScraperStats;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private scraperPath: string;

  constructor(config: Partial<ScraperConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      refreshInterval: 24 * 60 * 60 * 1000, // 24 hours default
      maxConcurrent: 2,
      requestDelay: 2000,
      retryAttempts: 3,
      outputDir: './production-react-bits-extraction',
      ...config
    };

    this.stats = {
      lastRun: 0,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      componentsScraped: 0
    };

    this.scraperPath = path.resolve(process.cwd(), 'production-react-bits-scraper.js');
  }

  /**
   * Start the scraper integration service
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.info('Scraper integration disabled by configuration');
      return;
    }

    console.info('Starting ReactBits scraper integration service...');
    
    // Check if scraper file exists
    try {
      await fs.access(this.scraperPath);
    } catch (error) {
      console.warn('Production scraper not found, scraper integration disabled');
      this.config.enabled = false;
      return;
    }

    // Start periodic refresh
    this.scheduleNextRefresh();

    // Check if we need an initial refresh
    const shouldRefreshInitially = await this.shouldRefreshData();
    if (shouldRefreshInitially) {
      console.info('Scheduling initial data refresh...');
      // Run after a short delay to allow server startup
      setTimeout(() => this.refreshData(), 5000);
    }

    this.emit('started');
  }

  /**
   * Stop the scraper integration service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined as any;
    }
    
    this.emit('stopped');
    console.info('ReactBits scraper integration service stopped');
  }

  /**
   * Manually trigger a data refresh
   */
  async refreshData(): Promise<boolean> {
    if (this.isRunning) {
      console.warn('Scraper is already running, skipping refresh');
      return false;
    }

    this.isRunning = true;
    this.stats.totalRuns++;
    this.stats.lastRun = Date.now();

    try {
      console.info('Starting ReactBits data refresh...');
      this.emit('refresh-start');

      // Import and run the production scraper
      const scraperModule = await import(this.scraperPath);
      const ProductionReactBitsScraper = scraperModule.default || scraperModule;

      const scraper = new ProductionReactBitsScraper({
        outputDir: this.config.outputDir,
        maxConcurrent: this.config.maxConcurrent,
        requestDelay: this.config.requestDelay,
        maxRetries: this.config.retryAttempts,
        includeUtilities: true,
        extractAllVariants: true
      });

      const report = await scraper.extract();
      
      this.stats.successfulRuns++;
      this.stats.componentsScraped = report.statistics.components.total;
      
      console.info(`Data refresh completed successfully: ${this.stats.componentsScraped} components extracted`);
      this.emit('refresh-success', report);

      return true;

    } catch (error) {
      this.stats.failedRuns++;
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('Data refresh failed:', this.stats.lastError);
      this.emit('refresh-error', error);

      return false;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if data needs refreshing
   */
  private async shouldRefreshData(): Promise<boolean> {
    try {
      // Check if extraction directory exists and has data
      const extractionExists = await this.checkExtractionExists();
      if (!extractionExists) {
        return true; // No data exists, need initial extraction
      }

      // Check if data is stale
      const indexPath = path.join(this.config.outputDir, 'component-index.json');
      const stats = await fs.stat(indexPath);
      const ageMs = Date.now() - stats.mtime.getTime();
      
      return ageMs > this.config.refreshInterval;

    } catch (error) {
      console.warn('Error checking data freshness:', error);
      return true; // Err on the side of refreshing
    }
  }

  /**
   * Check if extraction data exists
   */
  private async checkExtractionExists(): Promise<boolean> {
    try {
      const indexPath = path.join(this.config.outputDir, 'component-index.json');
      await fs.access(indexPath);
      
      const componentsDir = path.join(this.config.outputDir, 'components');
      await fs.access(componentsDir);
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Schedule the next refresh
   */
  private scheduleNextRefresh(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.refreshData().catch(error => {
        console.error('Scheduled refresh failed:', error);
      });
    }, this.config.refreshInterval);
  }

  /**
   * Get scraper statistics
   */
  getStats(): ScraperStats {
    return { ...this.stats };
  }

  /**
   * Get scraper configuration
   */
  getConfig(): ScraperConfig {
    return { ...this.config };
  }

  /**
   * Update scraper configuration
   */
  updateConfig(updates: Partial<ScraperConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Restart if refresh interval changed
    if (updates.refreshInterval && this.intervalId) {
      this.scheduleNextRefresh();
    }
  }

  /**
   * Check if scraper is currently running
   */
  isScraperRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get time until next scheduled refresh
   */
  getTimeUntilNextRefresh(): number {
    if (!this.intervalId) return -1;
    
    const timeSinceLastRun = Date.now() - this.stats.lastRun;
    const timeUntilNext = this.config.refreshInterval - timeSinceLastRun;
    
    return Math.max(0, timeUntilNext);
  }
}

/**
 * Default scraper integration instance
 */
export const defaultScraperIntegration = new ReactBitsScraperIntegration({
  enabled: process.env.NODE_ENV !== 'test', // Disable in tests
  refreshInterval: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrent: 2,
  requestDelay: 2000, // Be respectful to ReactBits.dev
  retryAttempts: 3
});