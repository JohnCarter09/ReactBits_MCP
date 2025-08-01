#!/usr/bin/env node

/**
 * React Bits Component Extractor
 * 
 * A comprehensive scraper to extract complete source code from React Bits components
 * GitHub Repository: https://github.com/DavidHDev/react-bits
 * Website: https://reactbits.dev
 * 
 * Features:
 * - Repository structure mapping
 * - Component source code extraction
 * - Multiple variant support (JS/TS + CSS/Tailwind)
 * - Rate limiting and anti-bot handling
 * - Comprehensive error handling and retry logic
 * - Structured data output with metadata
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { URL } = require('url');

class ReactBitsExtractor {
    constructor(options = {}) {
        this.baseUrl = 'https://api.github.com/repos/DavidHDev/react-bits';
        this.rawUrl = 'https://raw.githubusercontent.com/DavidHDev/react-bits/main';
        this.websiteUrl = 'https://reactbits.dev';
        
        this.options = {
            maxRetries: 3,
            retryDelay: 2000,
            requestDelay: 1000,
            outputDir: './extracted-components',
            includeUtilities: true,
            extractAllVariants: true,
            ...options
        };

        this.stats = {
            totalFiles: 0,
            extractedFiles: 0,
            failedFiles: 0,
            startTime: Date.now(),
            errors: []
        };

        this.componentData = [];
        this.repositoryStructure = {};
    }

    /**
     * HTTP request helper with retry logic and rate limiting
     */
    async makeRequest(url, options = {}) {
        const maxRetries = options.maxRetries || this.options.maxRetries;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.delay(this.options.requestDelay);
                
                const response = await this.httpRequest(url, {
                    headers: {
                        'User-Agent': 'React-Bits-Extractor/1.0.0 (https://github.com/user/extractor)',
                        'Accept': 'application/vnd.github.v3+json',
                        'Accept-Encoding': 'gzip, deflate',
                        ...options.headers
                    }
                });

                if (response.statusCode === 200) {
                    return JSON.parse(response.body);
                } else if (response.statusCode === 403) {
                    // Rate limit hit
                    const resetTime = response.headers['x-ratelimit-reset'];
                    if (resetTime) {
                        const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
                        console.log(`Rate limit hit. Waiting ${Math.ceil(waitTime / 1000)}s...`);
                        await this.delay(waitTime);
                        continue;
                    }
                }
                
                throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
                
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    console.warn(`Request failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
                    await this.delay(this.options.retryDelay * attempt);
                }
            }
        }

        throw lastError;
    }

    /**
     * Raw file request for source code extraction
     */
    async getRawFile(filePath) {
        const url = `${this.rawUrl}/${filePath}`;
        const maxRetries = this.options.maxRetries;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.delay(this.options.requestDelay);
                
                const response = await this.httpRequest(url, {
                    headers: {
                        'User-Agent': 'React-Bits-Extractor/1.0.0',
                        'Accept': '*/*',
                        'Cache-Control': 'no-cache'
                    }
                });

                if (response.statusCode === 200) {
                    return response.body;
                }
                
                throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
                
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    console.warn(`Raw file request failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
                    await this.delay(this.options.retryDelay * attempt);
                }
            }
        }

        throw lastError;
    }

    /**
     * Promise-based HTTP request
     */
    httpRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const requestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 443,
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'GET',
                headers: options.headers || {}
            };

            const req = https.request(requestOptions, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        headers: res.headers,
                        body: body
                    });
                });
            });

            req.on('error', reject);
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                req.write(options.body);
            }
            req.end();
        });
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Map the complete repository structure
     */
    async mapRepositoryStructure() {
        console.log('🗺️  Mapping repository structure...');
        
        try {
            // Get root directory
            const rootContents = await this.makeRequest(`${this.baseUrl}/contents`);
            this.repositoryStructure.root = rootContents;

            // Explore src directory specifically
            const srcContents = await this.makeRequest(`${this.baseUrl}/contents/src`);
            this.repositoryStructure.src = srcContents;

            // Map components directory
            const componentsPath = srcContents.find(item => item.name === 'components');
            if (componentsPath) {
                const componentContents = await this.makeRequest(componentsPath.url);
                this.repositoryStructure.components = componentContents;
                
                // Recursively map component subdirectories
                for (const item of componentContents) {
                    if (item.type === 'dir') {
                        try {
                            const subContents = await this.makeRequest(item.url);
                            this.repositoryStructure[`components/${item.name}`] = subContents;
                        } catch (error) {
                            console.warn(`Failed to map ${item.name}: ${error.message}`);
                        }
                    }
                }
            }

            // Check for alternative component locations
            await this.findAlternativeComponentPaths();

            console.log(`✅ Repository structure mapped: ${Object.keys(this.repositoryStructure).length} directories`);
            return this.repositoryStructure;

        } catch (error) {
            console.error('❌ Failed to map repository structure:', error.message);
            throw error;
        }
    }

    /**
     * Find alternative paths where components might be stored
     */
    async findAlternativeComponentPaths() {
        const potentialPaths = [
            'src/lib/components',
            'components',
            'lib/components',
            'src/ui',
            'ui',
            'packages'
        ];

        for (const path of potentialPaths) {
            try {
                const contents = await this.makeRequest(`${this.baseUrl}/contents/${path}`);
                this.repositoryStructure[path] = contents;
                console.log(`📁 Found alternative component path: ${path}`);
            } catch (error) {
                // Path doesn't exist, continue
            }
        }
    }

    /**
     * Discover and categorize all components
     */
    async discoverComponents() {
        console.log('🔍 Discovering components...');
        
        const components = [];
        const priorityPatterns = {
            animatedText: /animated.*text|text.*animat/i,
            buttons: /button|btn/i,
            threeD: /3d|three|webgl|canvas|three\.js/i,
            animation: /animat|motion|transition/i,
            ui: /ui|component/i
        };

        // Search through all mapped directories
        for (const [dirPath, contents] of Object.entries(this.repositoryStructure)) {
            if (!Array.isArray(contents)) continue;

            for (const item of contents) {
                if (item.type === 'file' && this.isComponentFile(item.name)) {
                    const component = {
                        name: this.extractComponentName(item.name),
                        filePath: `${dirPath}/${item.name}`.replace(/^src\//, ''),
                        fullPath: item.path,
                        downloadUrl: item.download_url,
                        size: item.size,
                        category: this.categorizeComponent(item.name, dirPath, priorityPatterns),
                        variant: this.detectVariant(item.name, dirPath),
                        priority: this.calculatePriority(item.name, dirPath, priorityPatterns)
                    };
                    
                    components.push(component);
                }
            }
        }

        // Sort by priority (high priority first)
        components.sort((a, b) => b.priority - a.priority);
        
        console.log(`✅ Discovered ${components.length} components`);
        return components;
    }

    /**
     * Check if file is a component file
     */
    isComponentFile(filename) {
        const componentExtensions = /\.(tsx?|jsx?)$/i;
        const excludePatterns = /\.(test|spec|stories|d\.ts)$/i;
        
        return componentExtensions.test(filename) && !excludePatterns.test(filename);
    }

    /**
     * Extract component name from filename
     */
    extractComponentName(filename) {
        return filename
            .replace(/\.(tsx?|jsx?)$/i, '') // Remove extension
            .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
            .replace(/\b\w/g, l => l.toUpperCase()); // Title case
    }

    /**
     * Categorize component based on name and path
     */
    categorizeComponent(filename, dirPath, patterns) {
        const fullPath = `${dirPath}/${filename}`.toLowerCase();
        
        if (patterns.animatedText.test(fullPath)) return 'animated-text';
        if (patterns.buttons.test(fullPath)) return 'button';
        if (patterns.threeD.test(fullPath)) return '3d-animation';
        if (patterns.animation.test(fullPath)) return 'animation';
        if (patterns.ui.test(fullPath)) return 'ui';
        
        return 'general';
    }

    /**
     * Detect component variant (JS/TS + CSS/Tailwind)
     */
    detectVariant(filename, dirPath) {
        const isTypeScript = /\.tsx?$/i.test(filename);
        const isTailwind = /tailwind|tw/i.test(dirPath) || /tailwind/i.test(filename);
        
        if (isTypeScript && isTailwind) return 'ts-tailwind';
        if (isTypeScript && !isTailwind) return 'ts-css';
        if (!isTypeScript && isTailwind) return 'js-tailwind';
        return 'js-css';
    }

    /**
     * Calculate component priority for extraction order
     */
    calculatePriority(filename, dirPath, patterns) {
        let priority = 1;
        const fullPath = `${dirPath}/${filename}`.toLowerCase();
        
        // High priority patterns
        if (patterns.animatedText.test(fullPath)) priority += 10;
        if (patterns.buttons.test(fullPath)) priority += 9;
        if (patterns.threeD.test(fullPath)) priority += 8;
        if (patterns.animation.test(fullPath)) priority += 5;
        
        // Boost for TypeScript
        if (/\.tsx?$/i.test(filename)) priority += 2;
        
        // Boost for Tailwind
        if (/tailwind/i.test(fullPath)) priority += 1;
        
        return priority;
    }

    /**
     * Extract complete source code for all discovered components
     */
    async extractComponents() {
        console.log('📦 Extracting component source code...');
        
        const components = await this.discoverComponents();
        this.stats.totalFiles = components.length;

        // Create output directory
        await this.ensureDirectory(this.options.outputDir);

        const results = [];
        
        for (const [index, component] of components.entries()) {
            console.log(`Processing ${index + 1}/${components.length}: ${component.name}`);
            
            try {
                const sourceCode = await this.getRawFile(component.fullPath);
                const extractedComponent = await this.processComponent(component, sourceCode);
                
                results.push(extractedComponent);
                this.stats.extractedFiles++;
                
                // Save individual component file
                await this.saveComponent(extractedComponent);
                
            } catch (error) {
                console.error(`❌ Failed to extract ${component.name}: ${error.message}`);
                this.stats.failedFiles++;
                this.stats.errors.push({
                    component: component.name,
                    error: error.message,
                    filePath: component.fullPath
                });
            }
        }

        this.componentData = results;
        return results;
    }

    /**
     * Process individual component and extract metadata
     */
    async processComponent(component, sourceCode) {
        const processed = {
            ...component,
            sourceCode: sourceCode,
            extractedAt: new Date().toISOString(),
            fileSize: Buffer.byteLength(sourceCode, 'utf8'),
            dependencies: this.extractDependencies(sourceCode),
            typeDefinitions: this.extractTypeDefinitions(sourceCode),
            props: this.extractPropsInterface(sourceCode),
            exports: this.extractExports(sourceCode),
            hasDefaultExport: /export\s+default/i.test(sourceCode),
            hasNamedExports: /export\s+(?:const|function|class|interface|type)/i.test(sourceCode)
        };

        return processed;
    }

    /**
     * Extract import dependencies from source code
     */
    extractDependencies(sourceCode) {
        const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))?\s*from\s+['"]([^'"]+)['"]/g;
        const dependencies = [];
        let match;

        while ((match = importRegex.exec(sourceCode)) !== null) {
            dependencies.push(match[1]);
        }

        return [...new Set(dependencies)]; // Remove duplicates
    }

    /**
     * Extract TypeScript type definitions
     */
    extractTypeDefinitions(sourceCode) {
        const typeRegex = /(interface\s+\w+\s*{[^}]*}|type\s+\w+\s*=\s*[^;]+;?)/g;
        const types = [];
        let match;

        while ((match = typeRegex.exec(sourceCode)) !== null) {
            types.push(match[1].trim());
        }

        return types;
    }

    /**
     * Extract component props interface
     */
    extractPropsInterface(sourceCode) {
        const propsRegex = /interface\s+(\w*Props?)\s*{([^}]*)}/g;
        const props = [];
        let match;

        while ((match = propsRegex.exec(sourceCode)) !== null) {
            props.push({
                interfaceName: match[1],
                properties: match[2].trim()
            });
        }

        return props;
    }

    /**
     * Extract export statements
     */
    extractExports(sourceCode) {
        const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|interface|type)?\s*(\w+)/g;
        const exports = [];
        let match;

        while ((match = exportRegex.exec(sourceCode)) !== null) {
            exports.push(match[1]);
        }

        return [...new Set(exports)];
    }

    /**
     * Extract utility files (hooks, utils, types)
     */
    async extractUtilities() {
        if (!this.options.includeUtilities) return [];

        console.log('🔧 Extracting utility files...');
        
        const utilityPatterns = [
            /hooks?/i,
            /utils?/i,
            /lib/i,
            /types?/i,
            /constants?/i,
            /helpers?/i
        ];

        const utilities = [];

        for (const [dirPath, contents] of Object.entries(this.repositoryStructure)) {
            if (!Array.isArray(contents)) continue;

            const isUtilityDir = utilityPatterns.some(pattern => pattern.test(dirPath));
            
            for (const item of contents) {
                if (item.type === 'file') {
                    const shouldExtract = isUtilityDir || 
                                        utilityPatterns.some(pattern => pattern.test(item.name)) ||
                                        /\.(ts|js)$/i.test(item.name);

                    if (shouldExtract) {
                        try {
                            const sourceCode = await this.getRawFile(item.path);
                            const utility = {
                                name: item.name,
                                filePath: item.path,
                                type: 'utility',
                                sourceCode: sourceCode,
                                fileSize: Buffer.byteLength(sourceCode, 'utf8'),
                                dependencies: this.extractDependencies(sourceCode),
                                extractedAt: new Date().toISOString()
                            };
                            
                            utilities.push(utility);
                            console.log(`✅ Extracted utility: ${item.name}`);
                            
                        } catch (error) {
                            console.warn(`⚠️  Failed to extract utility ${item.name}: ${error.message}`);
                        }
                    }
                }
            }
        }

        return utilities;
    }

    /**
     * Save individual component to file
     */
    async saveComponent(component) {
        const categoryDir = path.join(this.options.outputDir, component.category);
        await this.ensureDirectory(categoryDir);

        const filename = `${component.name.replace(/\s+/g, '-').toLowerCase()}.json`;
        const filepath = path.join(categoryDir, filename);

        await fs.writeFile(filepath, JSON.stringify(component, null, 2), 'utf8');
    }

    /**
     * Generate comprehensive extraction report
     */
    async generateReport() {
        console.log('📊 Generating extraction report...');

        const utilities = await this.extractUtilities();
        const endTime = Date.now();
        const duration = endTime - this.stats.startTime;

        const report = {
            metadata: {
                extractorVersion: '1.0.0',
                repository: 'https://github.com/DavidHDev/react-bits',
                extractedAt: new Date().toISOString(),
                duration: `${Math.round(duration / 1000)}s`,
                outputDirectory: this.options.outputDir
            },
            statistics: {
                ...this.stats,
                successRate: `${Math.round((this.stats.extractedFiles / this.stats.totalFiles) * 100)}%`,
                utilitiesExtracted: utilities.length
            },
            repositoryStructure: Object.keys(this.repositoryStructure).map(key => ({
                path: key,
                itemCount: Array.isArray(this.repositoryStructure[key]) ? this.repositoryStructure[key].length : 0
            })),
            componentsByCategory: this.groupComponentsByCategory(),
            componentsByVariant: this.groupComponentsByVariant(),
            priorityComponents: this.componentData.filter(c => c.priority > 5),
            utilities: utilities.map(u => ({
                name: u.name,
                filePath: u.filePath,
                fileSize: u.fileSize,
                dependencyCount: u.dependencies.length
            })),
            errors: this.stats.errors,
            recommendations: this.generateRecommendations()
        };

        // Save report
        const reportPath = path.join(this.options.outputDir, 'extraction-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

        // Save utilities
        if (utilities.length > 0) {
            const utilitiesPath = path.join(this.options.outputDir, 'utilities.json');
            await fs.writeFile(utilitiesPath, JSON.stringify(utilities, null, 2), 'utf8');
        }

        return report;
    }

    /**
     * Group components by category
     */
    groupComponentsByCategory() {
        const grouped = {};
        for (const component of this.componentData) {
            if (!grouped[component.category]) {
                grouped[component.category] = [];
            }
            grouped[component.category].push({
                name: component.name,
                filePath: component.filePath,
                variant: component.variant,
                priority: component.priority,
                fileSize: component.fileSize
            });
        }
        return grouped;
    }

    /**
     * Group components by variant
     */
    groupComponentsByVariant() {
        const grouped = {};
        for (const component of this.componentData) {
            if (!grouped[component.variant]) {
                grouped[component.variant] = [];
            }
            grouped[component.variant].push({
                name: component.name,
                category: component.category,
                priority: component.priority
            });
        }
        return grouped;
    }

    /**
     * Generate recommendations based on extraction results
     */
    generateRecommendations() {
        const recommendations = [];

        if (this.stats.failedFiles > 0) {
            recommendations.push({
                type: 'error',
                message: `${this.stats.failedFiles} files failed to extract. Check error details in the report.`
            });
        }

        const highPriorityCount = this.componentData.filter(c => c.priority > 8).length;
        if (highPriorityCount > 0) {
            recommendations.push({
                type: 'success',
                message: `Successfully extracted ${highPriorityCount} high-priority components (animated text, buttons, 3D animations).`
            });
        }

        const variantCounts = this.groupComponentsByVariant();
        const tsCount = (variantCounts['ts-tailwind']?.length || 0) + (variantCounts['ts-css']?.length || 0);
        if (tsCount > 0) {
            recommendations.push({
                type: 'info',
                message: `${tsCount} TypeScript components extracted. These provide better type safety for integration.`
            });
        }

        return recommendations;
    }

    /**
     * Ensure directory exists
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Main extraction process
     */
    async extract() {
        try {
            console.log('🚀 Starting React Bits component extraction...');
            console.log(`📂 Output directory: ${this.options.outputDir}`);
            
            // Step 1: Map repository structure
            await this.mapRepositoryStructure();
            
            // Step 2: Extract components
            await this.extractComponents();
            
            // Step 3: Generate comprehensive report
            const report = await this.generateReport();
            
            console.log('\n🎉 Extraction completed successfully!');
            console.log(`📊 Statistics:`);
            console.log(`   - Total files: ${this.stats.totalFiles}`);
            console.log(`   - Extracted: ${this.stats.extractedFiles}`);
            console.log(`   - Failed: ${this.stats.failedFiles}`);
            console.log(`   - Success rate: ${report.statistics.successRate}`);
            console.log(`   - Duration: ${report.metadata.duration}`);
            console.log(`📁 Output saved to: ${this.options.outputDir}`);
            
            return report;
            
        } catch (error) {
            console.error('💥 Extraction failed:', error.message);
            throw error;
        }
    }
}

// Export for use as module
module.exports = ReactBitsExtractor;

// CLI execution
if (require.main === module) {
    const extractor = new ReactBitsExtractor({
        outputDir: './extracted-react-bits',
        maxRetries: 3,
        requestDelay: 1500, // Be respectful to GitHub API
        includeUtilities: true,
        extractAllVariants: true
    });

    extractor.extract().catch(error => {
        console.error('❌ Extraction failed:', error.message);
        process.exit(1);
    });
}