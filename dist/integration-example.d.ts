/**
 * Integration Example for ReactBits MCP Server
 *
 * This file demonstrates how the ReactBits MCP server can integrate
 * with other MCP servers (puppeteer, magicui, playwright, firecrawl)
 * for enhanced functionality.
 *
 * Note: This is a conceptual example showing integration patterns.
 * Actual implementation would require proper MCP client setup.
 */
import type { ReactBitsComponent } from './types.js';
export declare class MCPIntegrationManager {
    private integrationConfigs;
    initializeIntegrations(): Promise<void>;
    /**
     * Take a screenshot of a component demo using Puppeteer
     * This is a conceptual example - actual implementation would use MCP client
     */
    captureComponentScreenshot(component: ReactBitsComponent): Promise<string | null>;
    /**
     * Scrape ReactBits.dev for new components using Firecrawl
     * This is a conceptual example - actual implementation would use MCP client
     */
    scrapeForNewComponents(): Promise<ReactBitsComponent[]>;
    /**
     * Test component interactivity using Playwright
     * This is a conceptual example - actual implementation would use MCP client
     */
    testComponentInteractivity(component: ReactBitsComponent): Promise<{
        passed: boolean;
        results: string[];
    }>;
    /**
     * Get component enhancement suggestions using MagicUI
     * This is a conceptual example - actual implementation would use MCP client
     */
    getComponentEnhancements(component: ReactBitsComponent): Promise<{
        accessibility: string[];
        performance: string[];
        designSystem: string[];
    }>;
    /**
     * Get a comprehensive component report with all integrations
     */
    getComprehensiveComponentReport(componentId: string): Promise<{
        component: ReactBitsComponent;
        screenshot?: string;
        testResults?: {
            passed: boolean;
            results: string[];
        };
        enhancements?: {
            accessibility: string[];
            performance: string[];
            designSystem: string[];
        };
        metadata: {
            reportGenerated: string;
            integrationsUsed: string[];
            totalExecutionTime: number;
        };
    }>;
    private transformScrapedComponents;
    disconnect(): Promise<void>;
}
export declare const createIntegratedReactBitsService: () => {
    initialize(): Promise<void>;
    getEnhancedComponent(componentId: string): Promise<{
        component: ReactBitsComponent;
        screenshot?: string;
        testResults?: {
            passed: boolean;
            results: string[];
        };
        enhancements?: {
            accessibility: string[];
            performance: string[];
            designSystem: string[];
        };
        metadata: {
            reportGenerated: string;
            integrationsUsed: string[];
            totalExecutionTime: number;
        };
    }>;
    discoverNewComponents(): Promise<ReactBitsComponent[]>;
    cleanup(): Promise<void>;
};
export default MCPIntegrationManager;
//# sourceMappingURL=integration-example.d.ts.map