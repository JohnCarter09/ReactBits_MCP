/**
 * ReactBits MCP Server Types
 * 
 * Comprehensive type definitions that align with MCP protocol specification
 * and provide strict type safety for all server operations.
 * 
 * @fileoverview MCP-compliant type definitions for ReactBits server
 * @version 1.0.0
 */

import type { ErrorCode, Tool } from '@modelcontextprotocol/sdk/types.js';

// Define JSONSchema type since it's not exported from MCP SDK
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  additionalProperties?: boolean;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  description?: string;
  examples?: unknown[];
  default?: unknown;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

// ============================================================================
// Core MCP Protocol Types - Enhanced for Full Compliance
// ============================================================================

/**
 * MCP-compliant tool definition with comprehensive input schema
 */
export interface MCPToolDefinition extends Omit<Tool, 'inputSchema'> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JSONSchema;
  readonly examples?: readonly ToolExample[];
  readonly version?: string;
  readonly deprecated?: boolean;
  readonly tags?: readonly string[];
}

/**
 * Tool usage example for documentation
 */
export interface ToolExample {
  readonly name: string;
  readonly description: string;
  readonly input: Record<string, unknown>;
  readonly expectedOutput?: Record<string, unknown>;
}

/**
 * MCP Resource definition for future extensibility
 */
export interface MCPResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
  readonly text?: string;
  readonly blob?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * MCP Prompt template definition
 */
export interface MCPPromptTemplate {
  readonly name: string;
  readonly description: string;
  readonly arguments?: readonly PromptArgument[];
  readonly messages: readonly PromptMessage[];
}

/**
 * Prompt template argument
 */
export interface PromptArgument {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly default?: unknown;
  readonly enum?: readonly unknown[];
}

/**
 * Prompt message in template
 */
export interface PromptMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

// ============================================================================
// Enhanced MCP Server Capabilities
// ============================================================================

/**
 * Complete MCP server capabilities definition
 */
export interface MCPServerCapabilities {
  readonly tools?: {
    readonly listChanged?: boolean;
  };
  readonly resources?: {
    readonly subscribe?: boolean;
    readonly listChanged?: boolean;
  };
  readonly prompts?: {
    readonly listChanged?: boolean;
  };
  readonly logging?: Record<string, unknown>;
  readonly sampling?: Record<string, unknown>;
}

/**
 * Represents a React component from ReactBits.dev with full metadata
 * 
 * @interface ReactBitsComponent
 * @description Core interface for React components with comprehensive metadata
 */
export interface ReactBitsComponent {
  /** Unique identifier for the component */
  readonly id: string;
  
  /** Human-readable component name */
  readonly name: string;
  
  /** Detailed description of component functionality */
  readonly description: string;
  
  /** Component category identifier */
  readonly category: string;
  
  /** Array of searchable tags */
  readonly tags: readonly string[];
  
  /** Short code preview snippet */
  readonly codePreview: string;
  
  /** Complete component source code (loaded on-demand) */
  fullCode?: string; // Not readonly to allow updates
  
  /** Required npm dependencies */
  readonly dependencies: readonly string[];
  
  /** ISO 8601 timestamp of last update */
  readonly lastUpdated: string;
  
  /** Skill level required to implement */
  readonly difficulty: ComponentDifficulty;
  
  /** Optional live demonstration URL */
  readonly demoUrl?: string;
  
  /** Component props documentation */
  readonly props?: readonly ComponentProp[];
  
  /** Component usage examples */
  readonly examples?: readonly ComponentExample[];
  
  /** Associated CSS/styling requirements */
  readonly styling?: ComponentStyling;
}

/**
 * Component difficulty levels
 */
export type ComponentDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Component prop definition
 */
export interface ComponentProp {
  readonly property: string;
  readonly type: string;
  readonly default?: string;
  readonly description: string;
  readonly required: boolean;
}

/**
 * Component usage example
 */
export interface ComponentExample {
  readonly title: string;
  readonly code: string;
  readonly description?: string;
}

/**
 * Component styling information
 */
export interface ComponentStyling {
  readonly framework?: 'tailwind' | 'css-modules' | 'styled-components' | 'emotion';
  readonly customCSS?: string;
  readonly variables?: Record<string, string>;
}

/**
 * Represents a component category with metadata
 * 
 * @interface ReactBitsCategory
 * @description Categorization structure for organizing components
 */
export interface ReactBitsCategory {
  /** Unique category identifier */
  readonly id: string;
  
  /** Human-readable category name */
  readonly name: string;
  
  /** Category description and purpose */
  readonly description: string;
  
  /** Total number of components in category */
  readonly componentCount: number;
  
  /** Optional subcategory identifiers */
  readonly subcategories: readonly string[];
  
  /** Category display order priority */
  readonly priority?: number;
  
  /** Category icon or emoji identifier */
  readonly icon?: string;
}

/**
 * Search and filtering parameters with strict validation
 * 
 * @interface SearchFilters
 * @description Comprehensive filtering options for component search
 */
export interface SearchFilters {
  /** Filter by specific category */
  category?: string;
  
  /** Filter by one or more tags */
  tags?: readonly string[];
  
  /** Filter by difficulty level */
  difficulty?: ComponentDifficulty;
  
  /** Filter components with demo availability */
  hasDemo?: boolean;
  
  /** Maximum results to return (1-50) */
  limit?: number;
  
  /** Results offset for pagination (>=0) */
  offset?: number;
  
  /** Filter by required dependencies */
  dependencies?: readonly string[];
  
  /** Filter by last updated date range */
  updatedAfter?: string;
  
  /** Sort order preference */
  sortBy?: 'name' | 'updated' | 'difficulty' | 'category';
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Standardized MCP tool response format
 * 
 * @interface ToolResponse
 * @description Type-safe response wrapper for all tool operations
 */
export interface ToolResponse<T = unknown> {
  /** Operation success status */
  readonly success: boolean;
  
  /** Response data (present when success = true) */
  readonly data?: T;
  
  /** Error message (present when success = false) */
  readonly error?: string;
  
  /** Additional response metadata */
  readonly metadata?: ToolResponseMetadata;
}

/**
 * Tool response metadata
 */
export interface ToolResponseMetadata {
  /** Operation execution time in milliseconds */
  readonly executionTime?: number;
  
  /** Cache hit/miss status */
  readonly cached?: boolean;
  
  /** Request timestamp */
  readonly timestamp?: string;
  
  /** Search query used */
  readonly query?: string;
  
  /** Applied filters */
  readonly filters?: SearchFilters;
  
  /** Number of results returned */
  readonly resultCount?: number;
  
  /** Error code for failed operations */
  readonly errorCode?: string;
  
  /** Error details */
  readonly details?: unknown;
  
  /** Request ID for tracing */
  readonly requestId?: string;
  
  /** Additional context information */
  readonly context?: Record<string, unknown>;
}

/**
 * Enhanced MCP-compliant error response with detailed context
 */
export interface MCPErrorResponse {
  readonly code: ErrorCode;
  readonly message: string;
  readonly data?: {
    readonly details?: unknown;
    readonly context?: Record<string, unknown>;
    readonly timestamp?: string;
    readonly requestId?: string;
    readonly stackTrace?: string;
    readonly suggestions?: readonly string[];
  };
}

/**
 * Request context for tracing and debugging
 */
export interface RequestContext {
  readonly requestId: string;
  readonly timestamp: number;
  readonly toolName?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * MCP Server health status
 */
export interface ServerHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly uptime: number;
  readonly version: string;
  readonly capabilities: string[];
  readonly metrics: {
    readonly requestCount: number;
    readonly errorCount: number;
    readonly averageResponseTime: number;
    readonly cacheHitRate: number;
  };
  readonly checks: readonly HealthCheck[];
}

/**
 * Individual health check result
 */
export interface HealthCheck {
  readonly name: string;
  readonly status: 'pass' | 'fail' | 'warn';
  readonly message?: string;
  readonly timestamp: number;
  readonly duration: number;
}

// Legacy interfaces for backward compatibility
export interface ComponentInfo {
  name: string;
  category: string;
  url: string;
  description?: string;
  props?: Array<{
    property: string;
    type: string;
    default: string;
    description: string;
  }>;
  dependencies?: string[];
  code?: {
    typescript?: string;
    javascript?: string;
  };
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  hasDemo?: boolean;
}

export interface SearchParams {
  query: string;
  category?: string;
  limit?: number;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  hasDemo?: boolean;
}

export interface CategoryInfo {
  category: string;
  componentCount: number;
  components: string[];
  hasMore: boolean;
  description?: string;
}

// ============================================================================
// Server Configuration Types
// ============================================================================

/**
 * MCP server configuration for external integrations
 */
export interface MCPServerConfig {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly timeout?: number;
  readonly retries?: number;
}

/**
 * ReactBits MCP server configuration
 */
export interface ReactBitsServerConfig {
  readonly server: {
    readonly name: string;
    readonly version: string;
    readonly maxCacheSize: number;
    readonly cacheExpiry: number;
  };
  readonly dataSource: {
    readonly baseUrl: string;
    readonly apiVersion: string;
    readonly timeout: number;
    readonly retries: number;
  };
  readonly tools: Record<string, {
    readonly cacheExpiry: number;
    readonly maxResults?: number;
  }>;
}

// ============================================================================
// Cache and Performance Types
// ============================================================================

/**
 * Generic cache entry with expiration
 */
export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
  readonly accessCount: number;
  readonly lastAccessed: number;
}

/**
 * Performance metrics for operations
 */
export interface PerformanceMetrics {
  readonly operationName: string;
  readonly duration: number;
  readonly cacheHit: boolean;
  readonly timestamp: number;
  readonly memoryUsage?: number;
}

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Enhanced error type with full MCP compliance and tracing
 */
export interface ReactBitsError extends Error {
  readonly code: string;
  readonly mcpErrorCode: ErrorCode;
  readonly details?: unknown;
  readonly timestamp: number;
  readonly context?: Record<string, unknown>;
  readonly requestId?: string;
  readonly toolName?: string;
  readonly retryable: boolean;
  readonly userFacing: boolean;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Error codes specific to ReactBits operations
 */
export enum ReactBitsErrorCode {
  INVALID_COMPONENT_ID = 'INVALID_COMPONENT_ID',
  COMPONENT_NOT_FOUND = 'COMPONENT_NOT_FOUND',
  INVALID_SEARCH_QUERY = 'INVALID_SEARCH_QUERY',
  INVALID_CATEGORY = 'INVALID_CATEGORY',
  CACHE_ERROR = 'CACHE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Enhanced input validation result with JSON Schema compliance
 */
export interface ValidationResult<T> {
  readonly valid: boolean;
  readonly data?: T;
  readonly errors: readonly ValidationError[];
  readonly warnings?: readonly ValidationWarning[];
  readonly schema?: JSONSchema;
  readonly path?: string;
}

/**
 * Validation warning for non-critical issues
 */
export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly severity: 'info' | 'warn';
  readonly suggestion?: string;
}

/**
 * Individual validation error
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly value?: unknown;
}