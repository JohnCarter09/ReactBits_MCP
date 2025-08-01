#!/usr/bin/env node

/**
 * Health Check and Monitoring System for ReactBits MCP Server
 * 
 * Provides comprehensive health monitoring, metrics collection,
 * and observability endpoints for production deployments.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

// ============================================================================
// Health Check System
// ============================================================================

export class HealthCheckSystem {
  private checks: Map<string, HealthCheckFunction> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  constructor() {
    this.registerDefaultChecks();
  }
  
  /**
   * Register a health check function
   */
  registerCheck(name: string, checkFn: HealthCheckFunction): void {
    this.checks.set(name, checkFn);
  }
  
  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const [name, checkFn] of this.checks) {
      try {
        const startTime = performance.now();
        const result = await checkFn();
        const duration = performance.now() - startTime;
        
        const healthResult: HealthCheckResult = {
          name,
          status: result.healthy ? 'pass' : 'fail',
          message: result.message,
          timestamp: Date.now(),
          duration: Math.round(duration),
          ...(result.details !== undefined && { details: result.details })
        };
        
        results.push(healthResult);
        this.lastResults.set(name, healthResult);
        
      } catch (error) {
        const errorResult: HealthCheckResult = {
          name,
          status: 'fail',
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
          duration: 0,
          details: { error: String(error) }
        };
        
        results.push(errorResult);
        this.lastResults.set(name, errorResult);
      }
    }
    
    // Update overall health status
    this.updateOverallHealthStatus(results);
    
    return results;
  }
  
  /**
   * Get current health status
   */
  getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    return this.healthStatus;
  }
  
  /**
   * Get last health check results
   */
  getLastResults(): HealthCheckResult[] {
    return Array.from(this.lastResults.values());
  }
  
  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    // Memory usage check
    this.registerCheck('memory_usage', async () => {
      const usage = process.memoryUsage();
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
      const rssUsedMB = Math.round(usage.rss / 1024 / 1024);
      
      const isHealthy = heapUsedMB < 400; // Alert if using more than 400MB
      
      return {
        healthy: isHealthy,
        message: isHealthy ? 
          `Memory usage normal: ${heapUsedMB}MB heap, ${rssUsedMB}MB RSS` :
          `High memory usage: ${heapUsedMB}MB heap, ${rssUsedMB}MB RSS`,
        details: {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          rss: rssUsedMB,
          external: Math.round(usage.external / 1024 / 1024)
        }
      };
    });
    
    // File system check
    this.registerCheck('filesystem', async () => {
      try {
        const testPath = path.join(process.cwd(), 'tmp-health-check');
        await fs.writeFile(testPath, 'health-check');
        await fs.unlink(testPath);
        
        return {
          healthy: true,
          message: 'File system access working normally',
          details: { testPath }
        };
      } catch (error) {
        return {
          healthy: false,
          message: `File system access failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error: String(error) }
        };
      }
    });
    
    // Data directory check
    this.registerCheck('data_directory', async () => {
      try {
        const extractionPath = path.resolve(process.cwd(), 'production-react-bits-extraction');
        const indexPath = path.join(extractionPath, 'component-index.json');
        
        await fs.access(extractionPath);
        const indexData = await fs.readFile(indexPath, 'utf-8');
        const components = JSON.parse(indexData);
        
        const isHealthy = Array.isArray(components) && components.length > 0;
        
        return {
          healthy: isHealthy,
          message: isHealthy ? 
            `Data directory accessible with ${components.length} components` :
            'Data directory exists but no components found',
          details: {
            path: extractionPath,
            componentCount: components.length
          }
        };
        
      } catch (error) {
        return {
          healthy: false,
          message: `Data directory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error: String(error) }
        };
      }
    });
    
    // Process uptime check
    this.registerCheck('uptime', async () => {
      const uptimeSeconds = process.uptime();
      const uptimeMinutes = Math.round(uptimeSeconds / 60);
      
      return {
        healthy: true,
        message: `Server running for ${uptimeMinutes} minutes`,
        details: {
          uptimeSeconds: Math.round(uptimeSeconds),
          uptimeMinutes,
          uptimeHours: Math.round(uptimeSeconds / 3600)
        }
      };
    });
    
    // Node.js version check
    this.registerCheck('nodejs_version', async () => {
      const version = process.version;
      const majorVersion = parseInt(version.substring(1).split('.')[0]);
      const isSupported = majorVersion >= 18;
      
      return {
        healthy: isSupported,
        message: isSupported ? 
          `Node.js version ${version} is supported` :
          `Node.js version ${version} is not supported (requires >=18)`,
        details: {
          version,
          majorVersion,
          platform: process.platform,
          arch: process.arch
        }
      };
    });
  }
  
  /**
   * Update overall health status based on check results
   */
  private updateOverallHealthStatus(results: HealthCheckResult[]): void {
    const failedChecks = results.filter(r => r.status === 'fail');
    const totalChecks = results.length;
    
    if (failedChecks.length === 0) {
      this.healthStatus = 'healthy';
    } else if (failedChecks.length / totalChecks < 0.5) {
      this.healthStatus = 'degraded';
    } else {
      this.healthStatus = 'unhealthy';
    }
  }
}

// ============================================================================
// Metrics Collection System
// ============================================================================

export class MetricsCollector {
  private metrics: Map<string, MetricValue[]> = new Map();
  private maxMetricAge: number;
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(maxMetricAge = 300000) { // 5 minutes default
    this.maxMetricAge = maxMetricAge;
    
    // Clean up old metrics every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000);
  }
  
  /**
   * Record a metric value
   */
  record(metric: string, value: number, labels: Record<string, string> = {}): void {
    const metricValue: MetricValue = {
      value,
      timestamp: Date.now(),
      labels
    };
    
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    
    this.metrics.get(metric)!.push(metricValue);
  }
  
  /**
   * Record operation duration
   */
  recordDuration(operation: string, startTime: number, labels: Record<string, string> = {}): void {
    const duration = performance.now() - startTime;
    this.record(`${operation}_duration`, duration, labels);
  }
  
  /**
   * Increment a counter
   */
  increment(counter: string, labels: Record<string, string> = {}): void {
    this.record(counter, 1, labels);
  }
  
  /**
   * Get metrics summary
   */
  getSummary(): MetricsSummary {
    const summary: MetricsSummary = {
      timestamp: Date.now(),
      metrics: {}
    };
    
    for (const [name, values] of this.metrics) {
      if (values.length === 0) continue;
      
      const numericValues = values.map(v => v.value);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const avg = sum / numericValues.length;
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      
      summary.metrics[name] = {
        count: values.length,
        sum,
        avg: Math.round(avg * 100) / 100,
        min,
        max,
        latest: values[values.length - 1].value
      };
    }
    
    return summary;
  }
  
  /**
   * Get raw metrics data
   */
  getMetrics(metric?: string): Record<string, MetricValue[]> {
    if (metric) {
      return { [metric]: this.metrics.get(metric) || [] };
    }
    
    return Object.fromEntries(this.metrics);
  }
  
  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.maxMetricAge;
    
    for (const [name, values] of this.metrics) {
      const filteredValues = values.filter(v => v.timestamp >= cutoffTime);
      this.metrics.set(name, filteredValues);
    }
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// ============================================================================
// Monitoring Configuration
// ============================================================================

export class MonitoringConfig {
  /**
   * Create Prometheus configuration
   */
  static generatePrometheusConfig(): string {
    return `
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'reactbits-mcp-server'
    static_configs:
      - targets: ['localhost:3000']
    scrape_interval: 30s
    metrics_path: '/metrics'
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          # - alertmanager:9093
`.trim();
  }
  
  /**
   * Create Grafana dashboard configuration
   */
  static generateGrafanaDashboard(): object {
    return {
      dashboard: {
        id: null,
        title: "ReactBits MCP Server",
        tags: ["mcp", "reactbits", "monitoring"],
        timezone: "browser",
        panels: [
          {
            id: 1,
            title: "Health Status",
            type: "stat",
            targets: [
              {
                expr: "reactbits_health_status",
                refId: "A"
              }
            ],
            fieldConfig: {
              defaults: {
                color: {
                  mode: "thresholds"
                },
                thresholds: {
                  steps: [
                    { color: "green", value: null },
                    { color: "yellow", value: 1 },
                    { color: "red", value: 2 }
                  ]
                }
              }
            }
          },
          {
            id: 2,
            title: "Request Rate",
            type: "graph",
            targets: [
              {
                expr: "rate(reactbits_requests_total[5m])",
                refId: "A"
              }
            ]
          },
          {
            id: 3,
            title: "Response Time",
            type: "graph",
            targets: [
              {
                expr: "reactbits_request_duration_seconds",
                refId: "A"
              }
            ]
          },
          {
            id: 4,
            title: "Memory Usage",
            type: "graph",
            targets: [
              {
                expr: "reactbits_memory_usage_bytes",
                refId: "A"
              }
            ]
          }
        ],
        time: {
          from: "now-1h",
          to: "now"
        },
        refresh: "30s"
      }
    };
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

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

// ============================================================================
// Default Export
// ============================================================================

export const defaultHealthCheck = new HealthCheckSystem();
export const defaultMetrics = new MetricsCollector();