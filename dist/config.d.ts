import { MCPServerConfig, MCPServerCapabilities } from './types.js';
export declare const config: {
    server: {
        name: string;
        version: string;
        maxCacheSize: number;
        cacheExpiry: number;
        maxRequestsPerMinute: number;
        requestTimeout: number;
        enableMetrics: boolean;
        enableTracing: boolean;
        logLevel: string;
    };
    dataSource: {
        baseUrl: string;
        apiVersion: string;
        timeout: number;
        retries: number;
        retryDelay: number;
        enableCompression: boolean;
    };
    tools: {
        search_components: {
            cacheExpiry: number;
            maxResults: number;
            enablePagination: boolean;
            validateInput: boolean;
        };
        get_component: {
            cacheExpiry: number;
            includeFullCode: boolean;
            enableMetadata: boolean;
        };
        list_categories: {
            cacheExpiry: number;
            includeComponentCounts: boolean;
            enableSubcategories: boolean;
        };
        browse_category: {
            cacheExpiry: number;
            maxResults: number;
            enablePagination: boolean;
        };
        get_random_component: {
            cacheExpiry: number;
            includeFullCode: boolean;
        };
    };
    validation: {
        enableStrict: boolean;
        maxStringLength: number;
        maxArrayLength: number;
        allowAdditionalProperties: boolean;
    };
    security: {
        enableCsrf: boolean;
        enableRateLimit: boolean;
        trustedOrigins: string[];
        maxRequestSize: string;
    };
};
/**
 * MCP Server Capabilities Declaration
 */
export declare const SERVER_CAPABILITIES: MCPServerCapabilities;
export declare const REACTBITS_CONFIG: {
    baseUrl: string;
    categories: {
        'text-animations': {
            path: string;
            components: string[];
        };
        backgrounds: {
            path: string;
            components: string[];
        };
        components: {
            path: string;
            components: string[];
        };
        animations: {
            path: string;
            components: string[];
        };
        buttons: {
            path: string;
            components: string[];
        };
        'button-animations': {
            path: string;
            components: string[];
        };
        cards: {
            path: string;
            components: string[];
        };
        navigation: {
            path: string;
            components: string[];
        };
        'number-animations': {
            path: string;
            components: string[];
        };
    };
    cache: {
        ttl: number;
        maxSize: number;
    };
    scraping: {
        timeout: number;
        retries: number;
        retryDelay: number;
        userAgent: string;
        maxConcurrent: number;
    };
};
export declare const MCP_VERSION = "2024-11-05";
export declare const SERVER_VERSION = "2.0.0";
export declare const API_VERSION = "v1";
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug",
    TRACE = "trace"
}
export declare enum CacheStrategy {
    LRU = "lru",
    TTL = "ttl",
    HYBRID = "hybrid"
}
export declare const TOOL_SCHEMAS: {
    readonly search_components: {
        readonly type: "object";
        readonly properties: {
            readonly query: {
                readonly type: "string";
                readonly minLength: 1;
                readonly maxLength: 200;
                readonly description: "Search query for component names, descriptions, or tags";
                readonly examples: readonly ["button", "animation", "card hover effect"];
            };
            readonly category: {
                readonly type: "string";
                readonly minLength: 1;
                readonly maxLength: 50;
                readonly description: "Filter by component category";
            };
            readonly tags: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                    readonly maxLength: 30;
                };
                readonly maxItems: 10;
                readonly uniqueItems: true;
                readonly description: "Filter by component tags";
            };
            readonly difficulty: {
                readonly type: "string";
                readonly enum: readonly ["beginner", "intermediate", "advanced"];
                readonly description: "Filter by difficulty level";
            };
            readonly hasDemo: {
                readonly type: "boolean";
                readonly description: "Filter components that have demo URLs";
            };
            readonly limit: {
                readonly type: "integer";
                readonly minimum: 1;
                readonly maximum: 50;
                readonly default: 10;
                readonly description: "Maximum number of results to return";
            };
            readonly offset: {
                readonly type: "integer";
                readonly minimum: 0;
                readonly default: 0;
                readonly description: "Number of results to skip (for pagination)";
            };
        };
        readonly required: readonly ["query"];
        readonly additionalProperties: false;
    };
    readonly get_component: {
        readonly type: "object";
        readonly properties: {
            readonly id: {
                readonly type: "string";
                readonly minLength: 1;
                readonly maxLength: 100;
                readonly pattern: "^[a-zA-Z0-9\\-_]+$";
                readonly description: "The unique identifier of the component";
            };
        };
        readonly required: readonly ["id"];
        readonly additionalProperties: false;
    };
    readonly list_categories: {
        readonly type: "object";
        readonly properties: {};
        readonly additionalProperties: false;
    };
    readonly browse_category: {
        readonly type: "object";
        readonly properties: {
            readonly categoryId: {
                readonly type: "string";
                readonly minLength: 1;
                readonly maxLength: 50;
                readonly pattern: "^[a-zA-Z0-9\\-_]+$";
                readonly description: "The category identifier to browse";
            };
            readonly limit: {
                readonly type: "integer";
                readonly minimum: 1;
                readonly maximum: 50;
                readonly default: 10;
                readonly description: "Maximum number of components to return";
            };
            readonly offset: {
                readonly type: "integer";
                readonly minimum: 0;
                readonly default: 0;
                readonly description: "Number of components to skip (for pagination)";
            };
        };
        readonly required: readonly ["categoryId"];
        readonly additionalProperties: false;
    };
    readonly get_random_component: {
        readonly type: "object";
        readonly properties: {};
        readonly additionalProperties: false;
    };
};
export declare const MCP_SERVERS: Record<string, MCPServerConfig>;
/**
 * Get environment-specific configuration overrides
 */
export declare function getEnvironmentConfig(): {
    server: {
        name: string;
        version: string;
        maxCacheSize: number;
        cacheExpiry: number;
        maxRequestsPerMinute: number;
        requestTimeout: number;
        enableMetrics: boolean;
        enableTracing: boolean;
        logLevel: string;
    };
    dataSource: {
        baseUrl: string;
        apiVersion: string;
        timeout: number;
        retries: number;
        retryDelay: number;
        enableCompression: boolean;
    };
    tools: {
        search_components: {
            cacheExpiry: number;
            maxResults: number;
            enablePagination: boolean;
            validateInput: boolean;
        };
        get_component: {
            cacheExpiry: number;
            includeFullCode: boolean;
            enableMetadata: boolean;
        };
        list_categories: {
            cacheExpiry: number;
            includeComponentCounts: boolean;
            enableSubcategories: boolean;
        };
        browse_category: {
            cacheExpiry: number;
            maxResults: number;
            enablePagination: boolean;
        };
        get_random_component: {
            cacheExpiry: number;
            includeFullCode: boolean;
        };
    };
    validation: {
        enableStrict: boolean;
        maxStringLength: number;
        maxArrayLength: number;
        allowAdditionalProperties: boolean;
    };
    security: {
        enableCsrf: boolean;
        enableRateLimit: boolean;
        trustedOrigins: string[];
        maxRequestSize: string;
    };
};
/**
 * Get the active configuration based on environment
 */
export declare const activeConfig: {
    server: {
        name: string;
        version: string;
        maxCacheSize: number;
        cacheExpiry: number;
        maxRequestsPerMinute: number;
        requestTimeout: number;
        enableMetrics: boolean;
        enableTracing: boolean;
        logLevel: string;
    };
    dataSource: {
        baseUrl: string;
        apiVersion: string;
        timeout: number;
        retries: number;
        retryDelay: number;
        enableCompression: boolean;
    };
    tools: {
        search_components: {
            cacheExpiry: number;
            maxResults: number;
            enablePagination: boolean;
            validateInput: boolean;
        };
        get_component: {
            cacheExpiry: number;
            includeFullCode: boolean;
            enableMetadata: boolean;
        };
        list_categories: {
            cacheExpiry: number;
            includeComponentCounts: boolean;
            enableSubcategories: boolean;
        };
        browse_category: {
            cacheExpiry: number;
            maxResults: number;
            enablePagination: boolean;
        };
        get_random_component: {
            cacheExpiry: number;
            includeFullCode: boolean;
        };
    };
    validation: {
        enableStrict: boolean;
        maxStringLength: number;
        maxArrayLength: number;
        allowAdditionalProperties: boolean;
    };
    security: {
        enableCsrf: boolean;
        enableRateLimit: boolean;
        trustedOrigins: string[];
        maxRequestSize: string;
    };
};
//# sourceMappingURL=config.d.ts.map