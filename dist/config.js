// ============================================================================
// MCP Server Configuration - Used by index.ts
// ============================================================================
// ============================================================================
// Enhanced MCP Server Configuration for Production
// ============================================================================
export const config = {
    server: {
        name: 'reactbits-mcp-server',
        version: '2.0.0',
        maxCacheSize: 1000,
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        maxRequestsPerMinute: 100,
        requestTimeout: 30000, // 30 seconds
        enableMetrics: true,
        enableTracing: true,
        logLevel: process.env.LOG_LEVEL || 'info',
    },
    dataSource: {
        baseUrl: 'https://reactbits.dev',
        apiVersion: 'v1',
        timeout: 15000, // 15 seconds
        retries: 3,
        retryDelay: 1000,
        enableCompression: true,
    },
    tools: {
        search_components: {
            cacheExpiry: 2 * 60 * 1000, // 2 minutes
            maxResults: 50,
            enablePagination: true,
            validateInput: true,
        },
        get_component: {
            cacheExpiry: 10 * 60 * 1000, // 10 minutes
            includeFullCode: true,
            enableMetadata: true,
        },
        list_categories: {
            cacheExpiry: 30 * 60 * 1000, // 30 minutes
            includeComponentCounts: true,
            enableSubcategories: true,
        },
        browse_category: {
            cacheExpiry: 5 * 60 * 1000, // 5 minutes
            maxResults: 50,
            enablePagination: true,
        },
        get_random_component: {
            cacheExpiry: 1 * 60 * 1000, // 1 minute
            includeFullCode: true,
        },
    },
    validation: {
        enableStrict: true,
        maxStringLength: 1000,
        maxArrayLength: 100,
        allowAdditionalProperties: false,
    },
    security: {
        enableCsrf: false, // Not applicable for MCP
        enableRateLimit: true,
        trustedOrigins: ['https://reactbits.dev'],
        maxRequestSize: '10mb',
    },
};
/**
 * MCP Server Capabilities Declaration
 */
export const SERVER_CAPABILITIES = {
    tools: {
        listChanged: false, // Static tool list
    },
    resources: {
        subscribe: false,
        listChanged: false,
    },
    prompts: {
        listChanged: false,
    },
    logging: {},
    sampling: {},
};
export const REACTBITS_CONFIG = {
    baseUrl: 'https://reactbits.dev',
    categories: {
        'text-animations': {
            path: '/text-animations',
            components: [
                'split-text', 'blur-text', 'rotating-text', 'typewriter-text',
                'scroll-velocity', 'animated-text'
            ]
        },
        'backgrounds': {
            path: '/backgrounds',
            components: [
                'beams', 'orb', 'particles', 'aurora', 'gradient-mesh',
                'animated-gradient', 'noise-background', 'dots-pattern', 'grid-pattern'
            ]
        },
        'components': {
            path: '/components',
            components: [
                'hero-sections', 'tilted-card', 'interactive-gallery',
                'feature-cards', 'testimonial-cards', 'pricing-cards',
                'contact-forms', 'newsletter-signup', 'search-bars',
                'progress-indicators', 'loading-spinners', 'modal-dialogs'
            ]
        },
        'animations': {
            path: '/animations',
            components: [
                'cursor-effects', 'splash-animations', 'scroll-animations',
                'hover-effects', 'entrance-animations', 'exit-animations',
                'transition-effects'
            ]
        },
        'buttons': {
            path: '/buttons',
            components: [
                'glow-button', 'magnetic-button', 'morphing-button',
                'ripple-button', 'gradient-button', 'animated-border-button'
            ]
        },
        'button-animations': {
            path: '/button-animations',
            components: [
                'ripple-effect', 'pulse-effect', 'bounce-effect',
                'shake-effect', 'glow-effect', 'transform-effect'
            ]
        },
        'cards': {
            path: '/cards',
            components: [
                'hover-cards', 'flip-cards', 'slide-cards',
                'expand-cards', 'tilt-cards', 'glass-cards'
            ]
        },
        'navigation': {
            path: '/navigation',
            components: [
                'gooey-navigation', 'sliding-tabs', 'animated-menu',
                'breadcrumbs', 'pagination', 'sidebar-navigation'
            ]
        },
        'number-animations': {
            path: '/number-animations',
            components: [
                'counting-numbers', 'animated-counter', 'progress-counter',
                'percentage-display', 'stat-counter', 'odometer-effect'
            ]
        }
    },
    cache: {
        ttl: 5 * 60 * 1000, // 5 minutes
        maxSize: 100
    },
    scraping: {
        timeout: 10000,
        retries: 3,
        retryDelay: 1000,
        userAgent: 'ReactBits-MCP-Server/2.0.0',
        maxConcurrent: 5,
    }
};
// ============================================================================
// Constants and Enums
// ============================================================================
export const MCP_VERSION = '2024-11-05';
export const SERVER_VERSION = '2.0.0';
export const API_VERSION = 'v1';
export var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
    LogLevel["TRACE"] = "trace";
})(LogLevel || (LogLevel = {}));
export var CacheStrategy;
(function (CacheStrategy) {
    CacheStrategy["LRU"] = "lru";
    CacheStrategy["TTL"] = "ttl";
    CacheStrategy["HYBRID"] = "hybrid";
})(CacheStrategy || (CacheStrategy = {}));
// ============================================================================
// JSON Schema Definitions for Tool Validation
// ============================================================================
export const TOOL_SCHEMAS = {
    search_components: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                minLength: 1,
                maxLength: 200,
                description: 'Search query for component names, descriptions, or tags',
                examples: ['button', 'animation', 'card hover effect']
            },
            category: {
                type: 'string',
                minLength: 1,
                maxLength: 50,
                description: 'Filter by component category'
            },
            tags: {
                type: 'array',
                items: { type: 'string', minLength: 1, maxLength: 30 },
                maxItems: 10,
                uniqueItems: true,
                description: 'Filter by component tags'
            },
            difficulty: {
                type: 'string',
                enum: ['beginner', 'intermediate', 'advanced'],
                description: 'Filter by difficulty level'
            },
            hasDemo: {
                type: 'boolean',
                description: 'Filter components that have demo URLs'
            },
            limit: {
                type: 'integer',
                minimum: 1,
                maximum: 50,
                default: 10,
                description: 'Maximum number of results to return'
            },
            offset: {
                type: 'integer',
                minimum: 0,
                default: 0,
                description: 'Number of results to skip (for pagination)'
            }
        },
        required: ['query'],
        additionalProperties: false
    },
    get_component: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
                pattern: '^[a-zA-Z0-9\\-_]+$',
                description: 'The unique identifier of the component'
            }
        },
        required: ['id'],
        additionalProperties: false
    },
    list_categories: {
        type: 'object',
        properties: {},
        additionalProperties: false
    },
    browse_category: {
        type: 'object',
        properties: {
            categoryId: {
                type: 'string',
                minLength: 1,
                maxLength: 50,
                pattern: '^[a-zA-Z0-9\\-_]+$',
                description: 'The category identifier to browse'
            },
            limit: {
                type: 'integer',
                minimum: 1,
                maximum: 50,
                default: 10,
                description: 'Maximum number of components to return'
            },
            offset: {
                type: 'integer',
                minimum: 0,
                default: 0,
                description: 'Number of components to skip (for pagination)'
            }
        },
        required: ['categoryId'],
        additionalProperties: false
    },
    get_random_component: {
        type: 'object',
        properties: {},
        additionalProperties: false
    }
};
// ============================================================================
// External MCP Server Integrations
// ============================================================================
export const MCP_SERVERS = {
    puppeteer: {
        name: 'puppeteer',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-puppeteer'],
        env: {
            'ALLOW_DANGEROUS': 'true'
        },
        timeout: 30000,
        retries: 2,
    },
    magicui: {
        name: 'magicui',
        command: 'npx',
        args: ['-y', 'magicui-mcp'],
        timeout: 15000,
        retries: 3,
    },
    playwright: {
        name: 'mcp-server-playwright',
        command: 'npx',
        args: ['-y', '@smithery/cli@latest', 'run', '@automatalabs/mcp-server-playwright'],
        timeout: 30000,
        retries: 2,
    },
    firecrawl: {
        name: 'mcp-server-firecrawl',
        command: 'npx',
        args: ['-y', 'firecrawl-mcp'],
        env: {
            'FIRECRAWL_API_KEY': process.env.FIRECRAWL_API_KEY || 'fc-ed59b8834f974ba48790a928fb414e80',
            'FIRECRAWL_RETRY_MAX_ATTEMPTS': '5',
            'FIRECRAWL_RETRY_INITIAL_DELAY': '2000',
            'FIRECRAWL_RETRY_MAX_DELAY': '30000',
            'FIRECRAWL_RETRY_BACKOFF_FACTOR': '3',
            'FIRECRAWL_CREDIT_WARNING_THRESHOLD': '2000',
            'FIRECRAWL_CREDIT_CRITICAL_THRESHOLD': '500'
        },
        timeout: 60000,
        retries: 3,
    }
};
// ============================================================================
// Environment-based Configuration
// ============================================================================
/**
 * Get environment-specific configuration overrides
 */
export function getEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'development';
    const baseConfig = { ...config };
    switch (env) {
        case 'production':
            return {
                ...baseConfig,
                server: {
                    ...baseConfig.server,
                    logLevel: 'warn',
                    enableMetrics: true,
                    enableTracing: false,
                },
                validation: {
                    ...baseConfig.validation,
                    enableStrict: true,
                },
            };
        case 'test':
            return {
                ...baseConfig,
                server: {
                    ...baseConfig.server,
                    logLevel: 'error',
                    enableMetrics: false,
                    enableTracing: false,
                    maxCacheSize: 100,
                },
            };
        case 'development':
        default:
            return baseConfig;
    }
}
/**
 * Get the active configuration based on environment
 */
export const activeConfig = getEnvironmentConfig();
//# sourceMappingURL=config.js.map