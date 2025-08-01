import { ReactBitsError, ReactBitsComponent, SearchFilters, ToolResponse, ComponentDifficulty, ValidationResult, ReactBitsErrorCode, PerformanceMetrics, RequestContext, JSONSchema } from './types.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
/**
 * Enhanced ReactBits MCP Server Utilities
 *
 * Comprehensive utility functions for MCP protocol compliance,
 * input validation, caching, and performance monitoring.
 *
 * @fileoverview MCP-compliant utility functions
 * @version 2.0.0
 */
/**
 * Production-ready LRU Cache with comprehensive metrics and MCP optimization
 */
export declare class LRUCache<T> {
    private readonly cache;
    private readonly maxSize;
    private readonly defaultTtl;
    private hitCount;
    private missCount;
    private evictionCount;
    constructor(maxSize?: number, defaultTtl?: number);
    get(key: string): T | null;
    set(key: string, data: T, ttl?: number): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    /**
     * Get cache performance statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        hitCount: number;
        missCount: number;
        hitRate: number;
        evictionCount: number;
    };
    /**
     * Remove expired entries
     */
    cleanup(): void;
}
/**
 * Create enhanced MCP-compliant ReactBits error with comprehensive context
 */
export declare function createReactBitsError(message: string, code: ReactBitsErrorCode, details?: unknown, context?: Record<string, unknown>, requestId?: string, toolName?: string): ReactBitsError;
/**
 * Convert ReactBits error to MCP error
 */
export declare function toMcpError(error: ReactBitsError | Error): McpError;
/**
 * Enhanced input validation with JSON Schema support
 */
export declare function validateInput<T>(input: unknown, validator: (input: unknown) => ValidationResult<T>, context?: RequestContext): T;
/**
 * Validate input against JSON Schema
 */
export declare function validateWithSchema<T>(input: unknown, schema: JSONSchema, toolName: string, context?: RequestContext): T;
/**
 * Validate component ID with comprehensive checks
 */
export declare function validateComponentId(id: unknown): string;
/**
 * Validate search query with enhanced checks
 */
export declare function validateSearchQuery(query: unknown): string;
/**
 * Validate pagination parameters with strict bounds
 */
export declare function validatePagination(limit?: unknown, offset?: unknown): {
    limit: number;
    offset: number;
};
/**
 * Validate search filters with comprehensive validation
 */
export declare function validateSearchFilters(filters: unknown): SearchFilters;
/**
 * Format component for MCP response with strict typing
 */
export declare function formatComponent(component: ReactBitsComponent, includeFullCode?: boolean): Record<string, unknown>;
/**
 * Format search results with comprehensive pagination and metadata
 */
export declare function formatSearchResults(components: readonly ReactBitsComponent[], metadata: {
    query?: string;
    category?: string;
    filters?: SearchFilters;
    resultCount: number;
    hasMore?: boolean;
    executionTime?: number;
    total?: number;
    offset?: number;
    limit?: number;
}): ToolResponse<{
    components: Record<string, unknown>[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
        currentPage: number;
        totalPages: number;
    };
}>;
/**
 * Format error response with MCP compliance
 */
export declare function formatError(error: string, code?: ReactBitsErrorCode, details?: unknown): ToolResponse<never>;
/**
 * Create MCP-compliant tool result with proper content structure
 */
export declare function createToolResult<T>(response: ToolResponse<T>): {
    content: Array<{
        type: 'text';
        text: string;
    }>;
};
/**
 * Enhanced async operation measurement with comprehensive performance tracking
 */
export declare function measureAsync<T>(operation: () => Promise<T>, label?: string, enableLogging?: boolean, context?: RequestContext): Promise<{
    result: T;
    duration: number;
    metrics: PerformanceMetrics;
}>;
/**
 * Enhanced performance timer with additional metrics
 */
export declare class PerformanceTimer {
    private startTime;
    private readonly label;
    private laps;
    constructor(label?: string);
    elapsed(): number;
    lap(): number;
    reset(): void;
    getMetrics(): {
        label: string;
        totalElapsed: number;
        laps: number[];
        averageLap: number;
    };
}
/**
 * Enhanced delay function with timeout bounds
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Enhanced retry operation with circuit breaker pattern
 */
export declare function retryOperation<T>(operation: () => Promise<T>, options?: {
    maxRetries?: number;
    retryDelay?: number;
    exponentialBackoff?: boolean;
    retryCondition?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
}): Promise<T>;
/**
 * Enhanced URL sanitization with security checks
 */
export declare function sanitizeUrl(url: string): string;
/**
 * Enhanced category validation with normalization
 */
export declare function isValidCategory(category: string, validCategories: readonly string[]): boolean;
/**
 * Enhanced URL formatting with validation
 */
export declare function formatComponentUrl(baseUrl: string, category: string, componentName: string): string;
/**
 * Enhanced category parameter validation
 */
export declare function validateCategoryParams(params: any): {
    category: string;
};
/**
 * Generate a unique request ID for tracing
 */
export declare function generateRequestId(): string;
/**
 * Create request context for tracing and debugging
 */
export declare function createRequestContext(toolName?: string, userId?: string, sessionId?: string, metadata?: Record<string, unknown>): RequestContext;
/**
 * Enhanced logging utility with context awareness
 */
export declare class ContextLogger {
    private context;
    private enabledLevels;
    constructor(context: RequestContext, logLevel?: string);
    private getEnabledLevels;
    private formatMessage;
    error(message: string, error?: Error | unknown): void;
    warn(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    debug(message: string, data?: unknown): void;
    trace(message: string, data?: unknown): void;
}
/**
 * Rate limiting utility with sliding window
 */
export declare class RateLimiter {
    private requests;
    private maxRequests;
    private windowMs;
    constructor(maxRequests?: number, windowMs?: number);
    /**
     * Check if request is allowed
     */
    isAllowed(identifier: string): boolean;
    /**
     * Get remaining requests in current window
     */
    getRemaining(identifier: string): number;
    /**
     * Get time until window resets
     */
    getResetTime(identifier: string): number;
    /**
     * Clear old entries to prevent memory leaks
     */
    cleanup(): void;
}
/**
 * Enhanced metrics collector
 */
export declare class MetricsCollector {
    private metrics;
    private maxMetrics;
    constructor(maxMetrics?: number);
    record(metric: PerformanceMetrics): void;
    getMetrics(operationName?: string): PerformanceMetrics[];
    getAverageResponseTime(operationName?: string): number;
    getCacheHitRate(operationName?: string): number;
    getOperationCounts(): Record<string, number>;
    clear(): void;
    getSummary(): {
        totalOperations: number;
        averageResponseTime: number;
        cacheHitRate: number;
        operationCounts: Record<string, number>;
    };
}
/**
 * Deep clone an object safely
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Truncate text to a maximum length with ellipsis
 */
export declare function truncateText(text: string, maxLength: number): string;
/**
 * Check if a value is a plain object
 */
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
/**
 * @deprecated Use measureAsync instead
 */
export declare function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{
    result: T;
    duration: number;
}>;
/**
 * @deprecated Use validateSearchQuery and validateSearchFilters instead
 */
export declare function validateSearchParams(params: any): {
    query: string;
    category?: string;
    limit?: number;
    tags?: string[];
    difficulty?: ComponentDifficulty;
    hasDemo?: boolean;
};
/**
 * @deprecated Use validateComponentId instead
 */
export declare function validateComponentParams(params: any): {
    name: string;
    category?: string;
    includeCode?: boolean;
};
//# sourceMappingURL=utils.d.ts.map