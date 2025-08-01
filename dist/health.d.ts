#!/usr/bin/env node
/**
 * Health Check and Monitoring System for ReactBits MCP Server
 *
 * Provides comprehensive health monitoring, metrics collection,
 * and observability endpoints for production deployments.
 */
export declare class HealthCheckSystem {
    private checks;
    private lastResults;
    private healthStatus;
    constructor();
    /**
     * Register a health check function
     */
    registerCheck(name: string, checkFn: HealthCheckFunction): void;
    /**
     * Run all health checks
     */
    runAllChecks(): Promise<HealthCheckResult[]>;
    /**
     * Get current health status
     */
    getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy';
    /**
     * Get last health check results
     */
    getLastResults(): HealthCheckResult[];
    /**
     * Register default health checks
     */
    private registerDefaultChecks;
    /**
     * Update overall health status based on check results
     */
    private updateOverallHealthStatus;
}
export declare class MetricsCollector {
    private metrics;
    private maxMetricAge;
    private cleanupInterval;
    constructor(maxMetricAge?: number);
    /**
     * Record a metric value
     */
    record(metric: string, value: number, labels?: Record<string, string>): void;
    /**
     * Record operation duration
     */
    recordDuration(operation: string, startTime: number, labels?: Record<string, string>): void;
    /**
     * Increment a counter
     */
    increment(counter: string, labels?: Record<string, string>): void;
    /**
     * Get metrics summary
     */
    getSummary(): MetricsSummary;
    /**
     * Get raw metrics data
     */
    getMetrics(metric?: string): Record<string, MetricValue[]>;
    /**
     * Clean up old metrics
     */
    private cleanupOldMetrics;
    /**
     * Clean up resources
     */
    destroy(): void;
}
export declare class MonitoringConfig {
    /**
     * Create Prometheus configuration
     */
    static generatePrometheusConfig(): string;
    /**
     * Create Grafana dashboard configuration
     */
    static generateGrafanaDashboard(): object;
}
export interface HealthCheckFunction {
    (): Promise<{
        healthy: boolean;
        message: string;
        details?: Record<string, any>;
    }>;
}
export interface HealthCheckResult {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    timestamp: number;
    duration: number;
    details?: Record<string, any>;
}
export interface MetricValue {
    value: number;
    timestamp: number;
    labels: Record<string, string>;
}
export interface MetricsSummary {
    timestamp: number;
    metrics: Record<string, {
        count: number;
        sum: number;
        avg: number;
        min: number;
        max: number;
        latest: number;
    }>;
}
export declare const defaultHealthCheck: HealthCheckSystem;
export declare const defaultMetrics: MetricsCollector;
//# sourceMappingURL=health.d.ts.map