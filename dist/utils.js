import { ReactBitsErrorCode } from './types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
/**
 * Enhanced ReactBits MCP Server Utilities
 *
 * Comprehensive utility functions for MCP protocol compliance,
 * input validation, caching, and performance monitoring.
 *
 * @fileoverview MCP-compliant utility functions
 * @version 2.0.0
 */
// ============================================================================
// Enhanced LRU Cache with Performance Metrics
// ============================================================================
/**
 * Production-ready LRU Cache with comprehensive metrics and MCP optimization
 */
export class LRUCache {
    cache = new Map();
    maxSize;
    defaultTtl;
    hitCount = 0;
    missCount = 0;
    evictionCount = 0;
    constructor(maxSize = 100, defaultTtl = 5 * 60 * 1000) {
        if (maxSize <= 0) {
            throw new Error('Cache maxSize must be greater than 0');
        }
        if (defaultTtl <= 0) {
            throw new Error('Cache defaultTtl must be greater than 0');
        }
        this.maxSize = maxSize;
        this.defaultTtl = defaultTtl;
    }
    get(key) {
        if (!key || typeof key !== 'string') {
            this.missCount++;
            return null;
        }
        const entry = this.cache.get(key);
        if (!entry) {
            this.missCount++;
            return null;
        }
        const now = Date.now();
        if (now > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            this.missCount++;
            return null;
        }
        // Update access tracking
        const updatedEntry = {
            ...entry,
            accessCount: entry.accessCount + 1,
            lastAccessed: now
        };
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, updatedEntry);
        this.hitCount++;
        return entry.data;
    }
    set(key, data, ttl) {
        if (!key || typeof key !== 'string') {
            throw new Error('Cache key must be a non-empty string');
        }
        // Remove oldest entries if at capacity
        while (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
                this.evictionCount++;
            }
            else {
                break; // Safety break
            }
        }
        const now = Date.now();
        this.cache.set(key, {
            data,
            timestamp: now,
            ttl: ttl || this.defaultTtl,
            accessCount: 0,
            lastAccessed: now
        });
    }
    has(key) {
        if (!key || typeof key !== 'string')
            return false;
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
        this.evictionCount = 0;
    }
    size() {
        return this.cache.size;
    }
    /**
     * Get cache performance statistics
     */
    getStats() {
        const totalRequests = this.hitCount + this.missCount;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
            evictionCount: this.evictionCount
        };
    }
    /**
     * Remove expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.timestamp + entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
}
// ============================================================================
// Enhanced Error Handling with MCP Compliance
// ============================================================================
/**
 * Create enhanced MCP-compliant ReactBits error with comprehensive context
 */
export function createReactBitsError(message, code, details, context, requestId, toolName) {
    const mcpErrorCode = mapToMcpErrorCode(code);
    const error = new Error(message);
    // Enhanced error properties for better debugging and handling
    error.code = code;
    error.mcpErrorCode = mcpErrorCode;
    error.details = details;
    error.timestamp = Date.now();
    error.context = context;
    error.requestId = requestId;
    error.toolName = toolName;
    error.retryable = isRetryableError(code);
    error.userFacing = isUserFacingError(code);
    error.severity = getErrorSeverity(code);
    return error;
}
/**
 * Map ReactBits error codes to MCP error codes
 */
function mapToMcpErrorCode(code) {
    switch (code) {
        case ReactBitsErrorCode.INVALID_COMPONENT_ID:
        case ReactBitsErrorCode.INVALID_SEARCH_QUERY:
        case ReactBitsErrorCode.INVALID_CATEGORY:
        case ReactBitsErrorCode.VALIDATION_ERROR:
            return ErrorCode.InvalidParams;
        case ReactBitsErrorCode.COMPONENT_NOT_FOUND:
            return ErrorCode.InvalidRequest;
        case ReactBitsErrorCode.RATE_LIMIT_EXCEEDED:
            return ErrorCode.InvalidRequest;
        case ReactBitsErrorCode.NETWORK_ERROR:
        case ReactBitsErrorCode.CACHE_ERROR:
        default:
            return ErrorCode.InternalError;
    }
}
/**
 * Determine if an error is retryable
 */
function isRetryableError(code) {
    switch (code) {
        case ReactBitsErrorCode.NETWORK_ERROR:
        case ReactBitsErrorCode.CACHE_ERROR:
            return true;
        case ReactBitsErrorCode.RATE_LIMIT_EXCEEDED:
            return true; // After delay
        default:
            return false;
    }
}
/**
 * Determine if an error should be shown to users
 */
function isUserFacingError(code) {
    switch (code) {
        case ReactBitsErrorCode.INVALID_COMPONENT_ID:
        case ReactBitsErrorCode.INVALID_SEARCH_QUERY:
        case ReactBitsErrorCode.INVALID_CATEGORY:
        case ReactBitsErrorCode.COMPONENT_NOT_FOUND:
        case ReactBitsErrorCode.VALIDATION_ERROR:
            return true;
        default:
            return false;
    }
}
/**
 * Get error severity level
 */
function getErrorSeverity(code) {
    switch (code) {
        case ReactBitsErrorCode.VALIDATION_ERROR:
        case ReactBitsErrorCode.INVALID_COMPONENT_ID:
        case ReactBitsErrorCode.INVALID_SEARCH_QUERY:
        case ReactBitsErrorCode.INVALID_CATEGORY:
            return 'low';
        case ReactBitsErrorCode.COMPONENT_NOT_FOUND:
            return 'medium';
        case ReactBitsErrorCode.RATE_LIMIT_EXCEEDED:
        case ReactBitsErrorCode.NETWORK_ERROR:
            return 'high';
        case ReactBitsErrorCode.CACHE_ERROR:
            return 'critical';
        default:
            return 'medium';
    }
}
/**
 * Convert ReactBits error to MCP error
 */
export function toMcpError(error) {
    if (error instanceof McpError) {
        return error;
    }
    const reactBitsError = error;
    // Map ReactBits error codes to MCP error codes
    let mcpErrorCode;
    switch (reactBitsError.code) {
        case ReactBitsErrorCode.INVALID_COMPONENT_ID:
        case ReactBitsErrorCode.INVALID_SEARCH_QUERY:
        case ReactBitsErrorCode.INVALID_CATEGORY:
        case ReactBitsErrorCode.VALIDATION_ERROR:
            mcpErrorCode = ErrorCode.InvalidParams;
            break;
        case ReactBitsErrorCode.COMPONENT_NOT_FOUND:
            mcpErrorCode = ErrorCode.InvalidRequest;
            break;
        case ReactBitsErrorCode.RATE_LIMIT_EXCEEDED:
            mcpErrorCode = ErrorCode.InvalidRequest;
            break;
        case ReactBitsErrorCode.NETWORK_ERROR:
        case ReactBitsErrorCode.CACHE_ERROR:
        default:
            mcpErrorCode = ErrorCode.InternalError;
            break;
    }
    return new McpError(mcpErrorCode, error.message, reactBitsError.details);
}
/**
 * Enhanced input validation with JSON Schema support
 */
export function validateInput(input, validator, context) {
    const result = validator(input);
    if (!result.valid) {
        const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join(', ');
        throw createReactBitsError(`Validation failed: ${errorMessages}`, ReactBitsErrorCode.VALIDATION_ERROR, {
            errors: result.errors,
            warnings: result.warnings,
            input,
            schema: result.schema
        }, context ? { requestId: context.requestId, toolName: context.toolName } : undefined, context?.requestId, context?.toolName);
    }
    // Log warnings if present
    if (result.warnings && result.warnings.length > 0) {
        console.warn('Validation warnings:', result.warnings.map(w => `${w.field}: ${w.message}`));
    }
    return result.data;
}
/**
 * Validate input against JSON Schema
 */
export function validateWithSchema(input, schema, toolName, context) {
    if (!schema) {
        throw createReactBitsError(`No schema found for tool: ${toolName}`, ReactBitsErrorCode.VALIDATION_ERROR, { toolName }, context ? { requestId: context.requestId } : undefined, context?.requestId, toolName);
    }
    const result = validateJsonSchema(input, schema);
    if (!result.valid) {
        const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join(', ');
        throw createReactBitsError(`Schema validation failed for ${toolName}: ${errorMessages}`, ReactBitsErrorCode.VALIDATION_ERROR, {
            errors: result.errors,
            input,
            schema,
            toolName
        }, context ? { requestId: context.requestId } : undefined, context?.requestId, toolName);
    }
    return input;
}
/**
 * Basic JSON Schema validator (simplified implementation)
 * In production, consider using a full JSON Schema library like Ajv
 */
function validateJsonSchema(data, schema) {
    const errors = [];
    const warnings = [];
    function validateValue(value, schemaObj, path = '') {
        if (schemaObj.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== schemaObj.type && !(value === null && !schemaObj.required)) {
                errors.push({
                    field: path || 'root',
                    message: `Expected type ${schemaObj.type}, got ${actualType}`,
                    code: 'TYPE_MISMATCH',
                    value
                });
                return;
            }
        }
        if (schemaObj.type === 'string' && typeof value === 'string') {
            if (schemaObj.minLength && value.length < schemaObj.minLength) {
                errors.push({
                    field: path || 'root',
                    message: `String too short (minimum ${schemaObj.minLength})`,
                    code: 'TOO_SHORT',
                    value
                });
            }
            if (schemaObj.maxLength && value.length > schemaObj.maxLength) {
                errors.push({
                    field: path || 'root',
                    message: `String too long (maximum ${schemaObj.maxLength})`,
                    code: 'TOO_LONG',
                    value
                });
            }
            if (schemaObj.pattern && !new RegExp(schemaObj.pattern).test(value)) {
                errors.push({
                    field: path || 'root',
                    message: `String does not match pattern ${schemaObj.pattern}`,
                    code: 'PATTERN_MISMATCH',
                    value
                });
            }
            if (schemaObj.enum && !schemaObj.enum.includes(value)) {
                errors.push({
                    field: path || 'root',
                    message: `Value must be one of: ${schemaObj.enum.join(', ')}`,
                    code: 'INVALID_ENUM',
                    value
                });
            }
        }
        if (schemaObj.type === 'integer' && typeof value === 'number') {
            if (!Number.isInteger(value)) {
                errors.push({
                    field: path || 'root',
                    message: 'Value must be an integer',
                    code: 'NOT_INTEGER',
                    value
                });
            }
            if (schemaObj.minimum !== undefined && value < schemaObj.minimum) {
                errors.push({
                    field: path || 'root',
                    message: `Value must be at least ${schemaObj.minimum}`,
                    code: 'TOO_SMALL',
                    value
                });
            }
            if (schemaObj.maximum !== undefined && value > schemaObj.maximum) {
                errors.push({
                    field: path || 'root',
                    message: `Value must be at most ${schemaObj.maximum}`,
                    code: 'TOO_LARGE',
                    value
                });
            }
        }
        if (schemaObj.type === 'array' && Array.isArray(value)) {
            if (schemaObj.maxItems && value.length > schemaObj.maxItems) {
                errors.push({
                    field: path || 'root',
                    message: `Array too long (maximum ${schemaObj.maxItems})`,
                    code: 'TOO_MANY_ITEMS',
                    value
                });
            }
            if (schemaObj.uniqueItems && new Set(value).size !== value.length) {
                warnings.push({
                    field: path || 'root',
                    message: 'Array contains duplicate items',
                    code: 'DUPLICATE_ITEMS',
                    severity: 'warn'
                });
            }
            if (schemaObj.items) {
                value.forEach((item, index) => {
                    validateValue(item, schemaObj.items, `${path}[${index}]`);
                });
            }
        }
        if (schemaObj.type === 'object' && typeof value === 'object' && value !== null) {
            const obj = value;
            // Check required properties
            if (schemaObj.required) {
                for (const requiredProp of schemaObj.required) {
                    if (!(requiredProp in obj)) {
                        errors.push({
                            field: path ? `${path}.${requiredProp}` : requiredProp,
                            message: 'Required property is missing',
                            code: 'MISSING_REQUIRED',
                            value: undefined
                        });
                    }
                }
            }
            // Check additional properties
            if (schemaObj.additionalProperties === false) {
                const allowedProps = new Set(Object.keys(schemaObj.properties || {}));
                for (const prop of Object.keys(obj)) {
                    if (!allowedProps.has(prop)) {
                        warnings.push({
                            field: path ? `${path}.${prop}` : prop,
                            message: 'Additional property not allowed in schema',
                            code: 'ADDITIONAL_PROPERTY',
                            severity: 'warn',
                            suggestion: `Remove property '${prop}' or update schema`
                        });
                    }
                }
            }
            // Validate properties
            if (schemaObj.properties) {
                for (const [propName, propSchema] of Object.entries(schemaObj.properties)) {
                    if (propName in obj) {
                        validateValue(obj[propName], propSchema, path ? `${path}.${propName}` : propName);
                    }
                }
            }
        }
    }
    validateValue(data, schema);
    return {
        valid: errors.length === 0,
        data: errors.length === 0 ? data : undefined,
        errors,
        warnings,
        schema
    };
}
// ============================================================================
// Enhanced MCP Server Validation Functions
// ============================================================================
/**
 * Validate component ID with comprehensive checks
 */
export function validateComponentId(id) {
    const validator = (input) => {
        const errors = [];
        if (input == null) {
            errors.push({
                field: 'id',
                message: 'Component ID is required',
                code: 'REQUIRED',
                value: input
            });
        }
        else if (typeof input !== 'string') {
            errors.push({
                field: 'id',
                message: 'Component ID must be a string',
                code: 'INVALID_TYPE',
                value: input
            });
        }
        else {
            const trimmed = input.trim();
            if (trimmed.length === 0) {
                errors.push({
                    field: 'id',
                    message: 'Component ID cannot be empty',
                    code: 'EMPTY_VALUE',
                    value: input
                });
            }
            else if (trimmed.length > 100) {
                errors.push({
                    field: 'id',
                    message: 'Component ID cannot exceed 100 characters',
                    code: 'TOO_LONG',
                    value: input
                });
            }
            else if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
                errors.push({
                    field: 'id',
                    message: 'Component ID can only contain alphanumeric characters, hyphens, and underscores',
                    code: 'INVALID_FORMAT',
                    value: input
                });
            }
            else {
                return { valid: true, data: trimmed, errors: [] };
            }
        }
        return { valid: false, errors };
    };
    return validateInput(id, validator);
}
/**
 * Validate search query with enhanced checks
 */
export function validateSearchQuery(query) {
    const validator = (input) => {
        const errors = [];
        if (input == null) {
            errors.push({
                field: 'query',
                message: 'Search query is required',
                code: 'REQUIRED',
                value: input
            });
        }
        else if (typeof input !== 'string') {
            errors.push({
                field: 'query',
                message: 'Search query must be a string',
                code: 'INVALID_TYPE',
                value: input
            });
        }
        else {
            const trimmed = input.trim();
            if (trimmed.length === 0) {
                errors.push({
                    field: 'query',
                    message: 'Search query cannot be empty',
                    code: 'EMPTY_VALUE',
                    value: input
                });
            }
            else if (trimmed.length > 200) {
                errors.push({
                    field: 'query',
                    message: 'Search query cannot exceed 200 characters',
                    code: 'TOO_LONG',
                    value: input
                });
            }
            else {
                return { valid: true, data: trimmed, errors: [] };
            }
        }
        return { valid: false, errors };
    };
    return validateInput(query, validator);
}
/**
 * Validate pagination parameters with strict bounds
 */
export function validatePagination(limit, offset) {
    const validator = (input) => {
        const obj = input;
        const errors = [];
        let validatedLimit = 10; // default
        let validatedOffset = 0; // default
        // Validate limit
        if (obj.limit !== undefined) {
            if (typeof obj.limit !== 'number' && typeof obj.limit !== 'string') {
                errors.push({
                    field: 'limit',
                    message: 'Limit must be a number',
                    code: 'INVALID_TYPE',
                    value: obj.limit
                });
            }
            else {
                const limitNum = Number(obj.limit);
                if (isNaN(limitNum)) {
                    errors.push({
                        field: 'limit',
                        message: 'Limit must be a valid number',
                        code: 'INVALID_NUMBER',
                        value: obj.limit
                    });
                }
                else if (limitNum < 1) {
                    errors.push({
                        field: 'limit',
                        message: 'Limit must be at least 1',
                        code: 'TOO_SMALL',
                        value: obj.limit
                    });
                }
                else if (limitNum > 50) {
                    errors.push({
                        field: 'limit',
                        message: 'Limit cannot exceed 50',
                        code: 'TOO_LARGE',
                        value: obj.limit
                    });
                }
                else {
                    validatedLimit = Math.floor(limitNum);
                }
            }
        }
        // Validate offset
        if (obj.offset !== undefined) {
            if (typeof obj.offset !== 'number' && typeof obj.offset !== 'string') {
                errors.push({
                    field: 'offset',
                    message: 'Offset must be a number',
                    code: 'INVALID_TYPE',
                    value: obj.offset
                });
            }
            else {
                const offsetNum = Number(obj.offset);
                if (isNaN(offsetNum)) {
                    errors.push({
                        field: 'offset',
                        message: 'Offset must be a valid number',
                        code: 'INVALID_NUMBER',
                        value: obj.offset
                    });
                }
                else if (offsetNum < 0) {
                    errors.push({
                        field: 'offset',
                        message: 'Offset cannot be negative',
                        code: 'NEGATIVE_VALUE',
                        value: obj.offset
                    });
                }
                else {
                    validatedOffset = Math.floor(offsetNum);
                }
            }
        }
        if (errors.length > 0) {
            return { valid: false, errors };
        }
        return { valid: true, data: { limit: validatedLimit, offset: validatedOffset }, errors: [] };
    };
    return validateInput({ limit, offset }, validator);
}
/**
 * Validate search filters with comprehensive validation
 */
export function validateSearchFilters(filters) {
    const validator = (input) => {
        if (input == null) {
            return { valid: true, data: {}, errors: [] };
        }
        if (typeof input !== 'object') {
            return {
                valid: false,
                errors: [{
                        field: 'filters',
                        message: 'Filters must be an object',
                        code: 'INVALID_TYPE',
                        value: input
                    }]
            };
        }
        const errors = [];
        const result = {};
        const inputObj = input;
        // Validate category
        if (inputObj.category !== undefined) {
            if (typeof inputObj.category === 'string') {
                const trimmed = inputObj.category.trim();
                if (trimmed.length > 0) {
                    result.category = trimmed;
                }
            }
            else {
                errors.push({
                    field: 'filters.category',
                    message: 'Category must be a string',
                    code: 'INVALID_TYPE',
                    value: inputObj.category
                });
            }
        }
        // Validate tags
        if (inputObj.tags !== undefined) {
            if (Array.isArray(inputObj.tags)) {
                const validTags = inputObj.tags
                    .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
                    .map(tag => tag.trim());
                if (validTags.length > 0) {
                    result.tags = validTags;
                }
            }
            else {
                errors.push({
                    field: 'filters.tags',
                    message: 'Tags must be an array',
                    code: 'INVALID_TYPE',
                    value: inputObj.tags
                });
            }
        }
        // Validate difficulty
        if (inputObj.difficulty !== undefined) {
            const validDifficulties = ['beginner', 'intermediate', 'advanced'];
            if (validDifficulties.includes(inputObj.difficulty)) {
                result.difficulty = inputObj.difficulty;
            }
            else {
                errors.push({
                    field: 'filters.difficulty',
                    message: `Difficulty must be one of: ${validDifficulties.join(', ')}`,
                    code: 'INVALID_VALUE',
                    value: inputObj.difficulty
                });
            }
        }
        // Validate hasDemo
        if (inputObj.hasDemo !== undefined) {
            result.hasDemo = Boolean(inputObj.hasDemo);
        }
        // Validate pagination within filters
        if (inputObj.limit !== undefined || inputObj.offset !== undefined) {
            try {
                const pagination = validatePagination(inputObj.limit, inputObj.offset);
                result.limit = pagination.limit;
                result.offset = pagination.offset;
            }
            catch (error) {
                if (error instanceof Error && 'details' in error) {
                    const details = error.details;
                    if (details?.errors) {
                        errors.push(...details.errors);
                    }
                }
            }
        }
        if (errors.length > 0) {
            return { valid: false, errors };
        }
        return { valid: true, data: result, errors: [] };
    };
    return validateInput(filters, validator);
}
// ============================================================================
// Enhanced Response Formatting Functions
// ============================================================================
/**
 * Format component for MCP response with strict typing
 */
export function formatComponent(component, includeFullCode = false) {
    const formatted = {
        id: component.id,
        name: component.name,
        description: component.description,
        category: component.category,
        tags: [...component.tags], // Create copy to avoid mutations
        codePreview: component.codePreview,
        dependencies: [...component.dependencies], // Create copy
        lastUpdated: component.lastUpdated,
        difficulty: component.difficulty,
    };
    // Optional fields - only include if present
    if (component.demoUrl) {
        formatted.demoUrl = component.demoUrl;
    }
    if (component.props && component.props.length > 0) {
        formatted.props = component.props.map(prop => ({
            property: prop.property,
            type: prop.type,
            default: prop.default,
            description: prop.description,
            required: prop.required
        }));
    }
    if (component.examples && component.examples.length > 0) {
        formatted.examples = component.examples.map(example => ({
            title: example.title,
            code: example.code,
            description: example.description
        }));
    }
    if (component.styling) {
        formatted.styling = {
            framework: component.styling.framework,
            customCSS: component.styling.customCSS,
            variables: component.styling.variables
        };
    }
    if (includeFullCode && component.fullCode) {
        formatted.fullCode = component.fullCode;
    }
    return formatted;
}
/**
 * Format search results with comprehensive pagination and metadata
 */
export function formatSearchResults(components, metadata) {
    const limit = metadata.filters?.limit || 10;
    const offset = metadata.filters?.offset || 0;
    const total = metadata.total || components.length;
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    return {
        success: true,
        data: {
            components: components.map(component => formatComponent(component)),
            pagination: {
                total,
                limit,
                offset,
                hasMore: metadata.hasMore || (offset + components.length < total),
                currentPage,
                totalPages
            }
        },
        metadata: {
            query: metadata.query,
            filters: metadata.filters,
            resultCount: metadata.resultCount,
            executionTime: metadata.executionTime,
            timestamp: new Date().toISOString(),
            cached: false // Will be updated by cache layer
        }
    };
}
/**
 * Format error response with MCP compliance
 */
export function formatError(error, code, details) {
    return {
        success: false,
        error,
        metadata: {
            errorCode: code,
            details,
            timestamp: new Date().toISOString()
        }
    };
}
/**
 * Create MCP-compliant tool result with proper content structure
 */
export function createToolResult(response) {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(response, null, 2)
            }
        ]
    };
}
// ============================================================================
// Enhanced Performance and Utility Functions
// ============================================================================
/**
 * Enhanced async operation measurement with comprehensive performance tracking
 */
export async function measureAsync(operation, label, enableLogging = false, context) {
    const start = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    try {
        const result = await operation();
        const duration = performance.now() - start;
        const endMemory = process.memoryUsage().heapUsed;
        const memoryDelta = endMemory - startMemory;
        const metrics = {
            operationName: label || 'unnamed_operation',
            duration,
            cacheHit: false, // Will be updated by cache layer
            timestamp: Date.now(),
            memoryUsage: memoryDelta
        };
        // Add request context to metrics if available
        if (context) {
            metrics.requestId = context.requestId;
            metrics.toolName = context.toolName;
        }
        if (enableLogging && label) {
            console.debug(`${label}: ${duration.toFixed(2)}ms (memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB)`);
        }
        return { result, duration, metrics };
    }
    catch (error) {
        const duration = performance.now() - start;
        const endMemory = process.memoryUsage().heapUsed;
        const memoryDelta = endMemory - startMemory;
        const metrics = {
            operationName: label || 'unnamed_operation',
            duration,
            cacheHit: false,
            timestamp: Date.now(),
            memoryUsage: memoryDelta
        };
        if (enableLogging && label) {
            console.debug(`${label} (failed): ${duration.toFixed(2)}ms (memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB)`);
        }
        // Re-throw with performance metrics attached
        if (error instanceof Error) {
            error.performanceMetrics = metrics;
        }
        throw error;
    }
}
/**
 * Enhanced performance timer with additional metrics
 */
export class PerformanceTimer {
    startTime;
    label;
    laps = [];
    constructor(label = 'timer') {
        this.startTime = performance.now();
        this.label = label;
    }
    elapsed() {
        return performance.now() - this.startTime;
    }
    lap() {
        const elapsed = this.elapsed();
        this.laps.push(elapsed);
        return elapsed;
    }
    reset() {
        this.startTime = performance.now();
        this.laps = [];
    }
    getMetrics() {
        return {
            label: this.label,
            totalElapsed: this.elapsed(),
            laps: [...this.laps],
            averageLap: this.laps.length > 0 ? this.laps.reduce((a, b) => a + b, 0) / this.laps.length : 0
        };
    }
}
/**
 * Enhanced delay function with timeout bounds
 */
export function delay(ms) {
    if (typeof ms !== 'number' || ms < 0) {
        throw new Error('Delay must be a non-negative number');
    }
    // Prevent excessive delays that could cause issues
    const maxDelay = 60000; // 1 minute
    const safeMs = Math.min(ms, maxDelay);
    return new Promise(resolve => setTimeout(resolve, safeMs));
}
/**
 * Enhanced retry operation with circuit breaker pattern
 */
export async function retryOperation(operation, options = {}) {
    const { maxRetries = 3, retryDelay = 1000, exponentialBackoff = true, retryCondition = () => true, onRetry } = options;
    let lastError;
    const attempts = [];
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            // Check if we should retry this error
            if (!retryCondition(lastError)) {
                throw lastError;
            }
            if (attempt === maxRetries) {
                break;
            }
            const currentDelay = exponentialBackoff
                ? retryDelay * Math.pow(2, attempt)
                : retryDelay;
            attempts.push({ attempt, error: lastError, delay: currentDelay });
            if (onRetry) {
                onRetry(attempt, lastError);
            }
            await delay(currentDelay);
        }
    }
    throw createReactBitsError(`Operation failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`, ReactBitsErrorCode.NETWORK_ERROR, {
        originalError: lastError,
        attempts,
        totalAttempts: maxRetries + 1
    });
}
/**
 * Enhanced URL sanitization with security checks
 */
export function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
        throw createReactBitsError('URL must be a non-empty string', ReactBitsErrorCode.VALIDATION_ERROR);
    }
    try {
        const parsed = new URL(url);
        // Security checks
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw createReactBitsError('Only HTTP and HTTPS URLs are allowed', ReactBitsErrorCode.VALIDATION_ERROR);
        }
        // Prevent localhost/private IP access in production
        if (process.env.NODE_ENV === 'production') {
            const hostname = parsed.hostname.toLowerCase();
            const privateIpPatterns = [
                /^localhost$/,
                /^127\./,
                /^10\./,
                /^172\.(1[6-9]|2[0-9]|3[01])\./,
                /^192\.168\./,
                /^::1$/,
                /^fe80:/
            ];
            if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
                throw createReactBitsError('Private network URLs are not allowed', ReactBitsErrorCode.VALIDATION_ERROR);
            }
        }
        return parsed.toString();
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Invalid URL')) {
            throw createReactBitsError('Invalid URL format provided', ReactBitsErrorCode.VALIDATION_ERROR, { originalUrl: url });
        }
        throw error; // Re-throw ReactBits errors
    }
}
/**
 * Enhanced category validation with normalization
 */
export function isValidCategory(category, validCategories) {
    if (!category || typeof category !== 'string') {
        return false;
    }
    const normalizedCategory = category.trim().toLowerCase();
    const normalizedValidCategories = validCategories.map(cat => cat.toLowerCase());
    return normalizedValidCategories.includes(normalizedCategory);
}
/**
 * Enhanced URL formatting with validation
 */
export function formatComponentUrl(baseUrl, category, componentName) {
    if (!baseUrl || !category || !componentName) {
        throw createReactBitsError('Base URL, category, and component name are required', ReactBitsErrorCode.VALIDATION_ERROR);
    }
    const sanitizedBaseUrl = sanitizeUrl(baseUrl);
    const sanitizedCategory = encodeURIComponent(category.trim());
    const sanitizedComponentName = encodeURIComponent(componentName.trim());
    return `${sanitizedBaseUrl.replace(/\/$/, '')}/${sanitizedCategory}/${sanitizedComponentName}`;
}
/**
 * Enhanced category parameter validation
 */
export function validateCategoryParams(params) {
    const category = validateComponentId(params.category); // Reuse validation logic
    return { category };
}
// ============================================================================
// Additional Utility Functions
// ============================================================================
/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Create request context for tracing and debugging
 */
export function createRequestContext(toolName, userId, sessionId, metadata) {
    const context = {
        requestId: generateRequestId(),
        timestamp: Date.now(),
        ...(toolName && { toolName }),
        ...(userId && { userId }),
        ...(sessionId && { sessionId }),
        ...(metadata && { metadata })
    };
    return context;
}
/**
 * Enhanced logging utility with context awareness
 */
export class ContextLogger {
    context;
    enabledLevels;
    constructor(context, logLevel = 'info') {
        this.context = context;
        this.enabledLevels = this.getEnabledLevels(logLevel);
    }
    getEnabledLevels(level) {
        const levels = ['error', 'warn', 'info', 'debug', 'trace'];
        const index = levels.indexOf(level);
        return new Set(levels.slice(0, index + 1));
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const contextInfo = [
            this.context.requestId,
            this.context.toolName,
            this.context.userId
        ].filter(Boolean).join(' | ');
        let formatted = `[${timestamp}] ${level.toUpperCase()} [${contextInfo}] ${message}`;
        if (data !== undefined) {
            formatted += ` ${JSON.stringify(data, null, 2)}`;
        }
        return formatted;
    }
    error(message, error) {
        if (this.enabledLevels.has('error')) {
            console.error(this.formatMessage('error', message, error));
        }
    }
    warn(message, data) {
        if (this.enabledLevels.has('warn')) {
            console.warn(this.formatMessage('warn', message, data));
        }
    }
    info(message, data) {
        if (this.enabledLevels.has('info')) {
            console.info(this.formatMessage('info', message, data));
        }
    }
    debug(message, data) {
        if (this.enabledLevels.has('debug')) {
            console.debug(this.formatMessage('debug', message, data));
        }
    }
    trace(message, data) {
        if (this.enabledLevels.has('trace')) {
            console.trace(this.formatMessage('trace', message, data));
        }
    }
}
/**
 * Rate limiting utility with sliding window
 */
export class RateLimiter {
    requests = new Map();
    maxRequests;
    windowMs;
    constructor(maxRequests = 100, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    /**
     * Check if request is allowed
     */
    isAllowed(identifier) {
        const now = Date.now();
        const requests = this.requests.get(identifier) || [];
        // Remove old requests outside the window
        const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
        if (validRequests.length >= this.maxRequests) {
            return false;
        }
        // Add current request
        validRequests.push(now);
        this.requests.set(identifier, validRequests);
        return true;
    }
    /**
     * Get remaining requests in current window
     */
    getRemaining(identifier) {
        const now = Date.now();
        const requests = this.requests.get(identifier) || [];
        const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
        return Math.max(0, this.maxRequests - validRequests.length);
    }
    /**
     * Get time until window resets
     */
    getResetTime(identifier) {
        const requests = this.requests.get(identifier) || [];
        if (requests.length === 0)
            return 0;
        const oldestRequest = Math.min(...requests);
        const resetTime = oldestRequest + this.windowMs;
        return Math.max(0, resetTime - Date.now());
    }
    /**
     * Clear old entries to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        for (const [identifier, requests] of this.requests.entries()) {
            const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
            if (validRequests.length === 0) {
                this.requests.delete(identifier);
            }
            else {
                this.requests.set(identifier, validRequests);
            }
        }
    }
}
/**
 * Enhanced metrics collector
 */
export class MetricsCollector {
    metrics = [];
    maxMetrics;
    constructor(maxMetrics = 1000) {
        this.maxMetrics = maxMetrics;
    }
    record(metric) {
        this.metrics.push(metric);
        // Keep only the most recent metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
    }
    getMetrics(operationName) {
        if (operationName) {
            return this.metrics.filter(m => m.operationName === operationName);
        }
        return [...this.metrics];
    }
    getAverageResponseTime(operationName) {
        const relevantMetrics = this.getMetrics(operationName);
        if (relevantMetrics.length === 0)
            return 0;
        const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
        return totalDuration / relevantMetrics.length;
    }
    getCacheHitRate(operationName) {
        const relevantMetrics = this.getMetrics(operationName);
        if (relevantMetrics.length === 0)
            return 0;
        const cacheHits = relevantMetrics.filter(m => m.cacheHit).length;
        return cacheHits / relevantMetrics.length;
    }
    getOperationCounts() {
        const counts = {};
        for (const metric of this.metrics) {
            counts[metric.operationName] = (counts[metric.operationName] || 0) + 1;
        }
        return counts;
    }
    clear() {
        this.metrics = [];
    }
    getSummary() {
        return {
            totalOperations: this.metrics.length,
            averageResponseTime: this.getAverageResponseTime(),
            cacheHitRate: this.getCacheHitRate(),
            operationCounts: this.getOperationCounts()
        };
    }
}
/**
 * Deep clone an object safely
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}
/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text, maxLength) {
    if (!text || typeof text !== 'string')
        return '';
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + '...';
}
/**
 * Check if a value is a plain object
 */
export function isPlainObject(value) {
    return value !== null &&
        typeof value === 'object' &&
        Object.prototype.toString.call(value) === '[object Object]';
}
// ============================================================================
// Legacy/Deprecated Functions (For Backward Compatibility)
// ============================================================================
/**
 * @deprecated Use measureAsync instead
 */
export function measureExecutionTime(fn) {
    console.warn('measureExecutionTime is deprecated. Use measureAsync instead.');
    return measureAsync(fn).then(({ result, duration }) => ({ result, duration }));
}
/**
 * @deprecated Use validateSearchQuery and validateSearchFilters instead
 */
export function validateSearchParams(params) {
    console.warn('validateSearchParams is deprecated. Use validateSearchQuery and validateSearchFilters instead.');
    const query = validateSearchQuery(params.query);
    const filters = validateSearchFilters(params);
    const result = {
        query
    };
    if (filters.category)
        result.category = filters.category;
    if (filters.limit !== undefined)
        result.limit = filters.limit;
    if (filters.tags && filters.tags.length > 0)
        result.tags = filters.tags;
    if (filters.difficulty)
        result.difficulty = filters.difficulty;
    if (filters.hasDemo !== undefined)
        result.hasDemo = filters.hasDemo;
    return result;
}
/**
 * @deprecated Use validateComponentId instead
 */
export function validateComponentParams(params) {
    console.warn('validateComponentParams is deprecated. Use validateComponentId instead.');
    const name = validateComponentId(params.name);
    const result = { name };
    if (params.category && typeof params.category === 'string') {
        result.category = params.category.trim();
    }
    if (params.includeCode !== undefined) {
        result.includeCode = Boolean(params.includeCode);
    }
    return result;
}
//# sourceMappingURL=utils.js.map