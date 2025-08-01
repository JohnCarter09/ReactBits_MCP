/**
 * ReactBits MCP Server Types
 *
 * Comprehensive type definitions that align with MCP protocol specification
 * and provide strict type safety for all server operations.
 *
 * @fileoverview MCP-compliant type definitions for ReactBits server
 * @version 1.0.0
 */
/**
 * Error codes specific to ReactBits operations
 */
export var ReactBitsErrorCode;
(function (ReactBitsErrorCode) {
    ReactBitsErrorCode["INVALID_COMPONENT_ID"] = "INVALID_COMPONENT_ID";
    ReactBitsErrorCode["COMPONENT_NOT_FOUND"] = "COMPONENT_NOT_FOUND";
    ReactBitsErrorCode["INVALID_SEARCH_QUERY"] = "INVALID_SEARCH_QUERY";
    ReactBitsErrorCode["INVALID_CATEGORY"] = "INVALID_CATEGORY";
    ReactBitsErrorCode["CACHE_ERROR"] = "CACHE_ERROR";
    ReactBitsErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ReactBitsErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ReactBitsErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
})(ReactBitsErrorCode || (ReactBitsErrorCode = {}));
//# sourceMappingURL=types.js.map