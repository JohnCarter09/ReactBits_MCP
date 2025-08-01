#!/usr/bin/env node

/**
 * Production React Bits Scraper
 * 
 * Advanced, production-ready scraper for extracting complete React Bits component library
 * Features: GitHub API integration, website scraping, anti-bot measures, comprehensive reporting
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

class ProductionReactBitsScraper {
    constructor(options = {}) {
        this.options = {
            outputDir: './react-bits-complete-extraction',
            maxConcurrent: 3,
            requestDelay: 1500,
            maxRetries: 3,
            retryDelay: 2000,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            includeUtilities: true,
            extractAllVariants: true,
            generateUsageExamples: true,
            ...options
        };

        this.baseUrls = {
            github: 'https://api.github.com/repos/DavidHDev/react-bits',
            raw: 'https://raw.githubusercontent.com/DavidHDev/react-bits/main',
            website: 'https://reactbits.dev'
        };

        this.stats = {
            totalFiles: 0,
            extractedFiles: 0,
            failedFiles: 0,
            startTime: Date.now(),
            errors: [],
            componentCategories: new Set(),
            variants: new Set()
        };

        this.extractedData = {
            components: [],
            utilities: [],
            repositoryStructure: {},
            websiteData: {}
        };
    }

    /**
     * Main extraction process
     */
    async extract() {
        console.log('🚀 Starting Production React Bits Extraction');
        console.log(`📂 Output: ${this.options.outputDir}\n`);

        try {
            await this.ensureDirectory(this.options.outputDir);

            // Phase 1: Repository structure analysis
            console.log('📋 PHASE 1: Repository Structure Analysis');
            await this.analyzeRepositoryStructure();

            // Phase 2: Component discovery and categorization
            console.log('\n🔍 PHASE 2: Component Discovery & Categorization');
            await this.discoverAndCategorizeComponents();

            // Phase 3: Source code extraction
            console.log('\n📦 PHASE 3: Source Code Extraction');
            await this.extractSourceCode();

            // Phase 4: Website data enrichment
            console.log('\n🌐 PHASE 4: Website Data Enrichment');
            await this.enrichWithWebsiteData();

            // Phase 5: Utility extraction
            console.log('\n🔧 PHASE 5: Utility Files Extraction');
            await this.extractUtilities();

            // Phase 6: Generate comprehensive report
            console.log('\n📊 PHASE 6: Report Generation');
            const report = await this.generateComprehensiveReport();

            console.log('\n🎉 Extraction completed successfully!');
            this.printFinalSummary(report);

            return report;

        } catch (error) {
            console.error('\n💥 Extraction failed:', error.message);
            throw error;
        }
    }

    /**
     * Analyze repository structure with comprehensive mapping
     */
    async analyzeRepositoryStructure() {
        const structure = {};
        const pathsToExplore = [
            '',
            'src',
            'src/components',
            'src/lib',
            'src/utils',
            'src/hooks',
            'components',
            'lib',
            'packages'
        ];

        for (const path of pathsToExplore) {
            try {
                const url = `${this.baseUrls.github}/contents/${path}`;
                const contents = await this.makeGitHubRequest(url);
                
                if (Array.isArray(contents)) {
                    structure[path || 'root'] = contents;
                    console.log(`   ✅ Mapped: ${path || 'root'} (${contents.length} items)`);
                    
                    // Recursively explore component directories
                    if (path.includes('components') && contents.length > 0) {
                        await this.exploreComponentDirectories(structure, path, contents);
                    }
                }
            } catch (error) {
                console.log(`   ⚠️  Skipped: ${path} (${error.message})`);
            }
        }

        this.extractedData.repositoryStructure = structure;
        console.log(`✅ Repository structure mapped: ${Object.keys(structure).length} directories`);
    }

    /**
     * Recursively explore component directories
     */
    async exploreComponentDirectories(structure, basePath, contents) {
        for (const item of contents) {
            if (item.type === 'dir') {
                try {
                    const subPath = `${basePath}/${item.name}`;
                    const subContents = await this.makeGitHubRequest(item.url);
                    
                    if (Array.isArray(subContents)) {
                        structure[subPath] = subContents;
                        console.log(`     📁 ${subPath} (${subContents.length} items)`);
                    }
                } catch (error) {
                    console.log(`     ❌ Failed: ${basePath}/${item.name}`);
                }
            }
        }
    }

    /**
     * Discover and categorize all components
     */
    async discoverAndCategorizeComponents() {
        const components = [];
        const priorityPatterns = {
            animatedText: /animated.*text|text.*animat|typewriter|fade.*text/i,
            buttons: /button|btn|cta|action/i,
            threeD: /3d|three|webgl|canvas|babylon|r3f/i,
            animations: /animat|motion|transition|spring|gesture/i,
            forms: /form|input|select|textarea|checkbox|radio/i,
            navigation: /nav|tab|breadcrumb|pagination|menu/i,
            layout: /layout|grid|flex|container|section/i,
            feedback: /toast|modal|alert|notification|tooltip/i
        };

        // Analyze all files in repository structure
        for (const [dirPath, contents] of Object.entries(this.extractedData.repositoryStructure)) {
            if (!Array.isArray(contents)) continue;

            for (const item of contents) {
                if (this.isComponentFile(item)) {
                    const component = {
                        name: this.extractComponentName(item.name),
                        fileName: item.name,
                        filePath: item.path,
                        fullPath: item.path,
                        downloadUrl: item.download_url,
                        size: item.size,
                        sha: item.sha,
                        directory: dirPath,
                        category: this.categorizeComponent(item.name, dirPath, priorityPatterns),
                        variant: this.detectVariant(item.name, dirPath),
                        priority: this.calculatePriority(item.name, dirPath, priorityPatterns),
                        lastModified: new Date().toISOString()
                    };

                    components.push(component);
                    this.stats.componentCategories.add(component.category);
                    this.stats.variants.add(component.variant);
                }
            }
        }

        // Sort by priority
        components.sort((a, b) => b.priority - a.priority);
        
        this.extractedData.components = components;
        console.log(`✅ Discovered ${components.length} components across ${this.stats.componentCategories.size} categories`);
        
        // Log category breakdown
        const categoryBreakdown = {};
        components.forEach(c => {
            categoryBreakdown[c.category] = (categoryBreakdown[c.category] || 0) + 1;
        });
        console.log('📊 Categories:', categoryBreakdown);
    }

    /**
     * Check if file is a component
     */
    isComponentFile(item) {
        if (item.type !== 'file') return false;
        
        const name = item.name.toLowerCase();
        const validExtensions = ['.tsx', '.jsx', '.ts', '.js'];
        const excludePatterns = ['.test.', '.spec.', '.stories.', '.d.ts', 'index.'];
        
        return validExtensions.some(ext => name.endsWith(ext)) &&
               !excludePatterns.some(pattern => name.includes(pattern));
    }

    /**
     * Extract component name from filename
     */
    extractComponentName(filename) {
        return filename
            .replace(/\.(tsx?|jsx?)$/i, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Categorize component based on patterns
     */
    categorizeComponent(filename, dirPath, patterns) {
        const fullPath = `${dirPath}/${filename}`.toLowerCase();
        
        for (const [category, pattern] of Object.entries(patterns)) {
            if (pattern.test(fullPath)) {
                return category.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
            }
        }
        
        // Category from directory name
        const dirCategory = this.extractCategoryFromDirectory(dirPath);
        if (dirCategory) return dirCategory;
        
        return 'ui-component';
    }

    /**
     * Extract category from directory path
     */
    extractCategoryFromDirectory(dirPath) {
        const categoryMap = {
            button: 'buttons',
            text: 'text-components',
            animation: 'animations',
            form: 'forms',
            nav: 'navigation',
            layout: 'layout',
            modal: 'feedback'
        };

        const pathLower = dirPath.toLowerCase();
        for (const [key, category] of Object.entries(categoryMap)) {
            if (pathLower.includes(key)) return category;
        }
        
        return null;
    }

    /**
     * Detect component variant
     */
    detectVariant(filename, dirPath) {
        const isTypeScript = /\.tsx?$/i.test(filename);
        const isTailwind = /tailwind|tw/i.test(dirPath) || /tailwind/i.test(filename);
        
        return `${isTypeScript ? 'ts' : 'js'}-${isTailwind ? 'tailwind' : 'css'}`;
    }

    /**
     * Calculate component priority
     */
    calculatePriority(filename, dirPath, patterns) {
        let priority = 1;
        const fullPath = `${dirPath}/${filename}`.toLowerCase();
        
        // High priority patterns
        if (patterns.animatedText.test(fullPath)) priority += 10;
        if (patterns.buttons.test(fullPath)) priority += 9;
        if (patterns.threeD.test(fullPath)) priority += 8;
        if (patterns.animations.test(fullPath)) priority += 6;
        
        // Boost for TypeScript
        if (/\.tsx?$/i.test(filename)) priority += 2;
        
        // Boost for Tailwind
        if (/tailwind/i.test(fullPath)) priority += 1;
        
        return priority;
    }

    /**
     * Extract source code for all components
     */
    async extractSourceCode() {
        const components = this.extractedData.components;
        this.stats.totalFiles = components.length;

        console.log(`Processing ${components.length} components...`);
        
        // Process in batches to respect rate limits
        const batchSize = this.options.maxConcurrent;
        for (let i = 0; i < components.length; i += batchSize) {
            const batch = components.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (component, index) => {
                const globalIndex = i + index + 1;
                console.log(`   [${globalIndex}/${components.length}] ${component.name}`);
                
                try {
                    const sourceCode = await this.extractComponentSource(component);
                    const processedComponent = this.processComponentSource(component, sourceCode);
                    
                    // Replace component in array with processed version
                    components[i + index] = processedComponent;
                    
                    await this.saveComponent(processedComponent);
                    this.stats.extractedFiles++;
                    
                    console.log(`     ✅ Extracted (${processedComponent.fileSize} bytes, ${processedComponent.dependencies.length} deps)`);
                    
                } catch (error) {
                    console.log(`     ❌ Failed: ${error.message}`);
                    this.stats.failedFiles++;
                    this.stats.errors.push({
                        component: component.name,
                        file: component.filePath,
                        error: error.message
                    });
                }
            }));
            
            // Delay between batches
            if (i + batchSize < components.length) {
                await this.delay(this.options.requestDelay);
            }
        }

        console.log(`✅ Source code extraction: ${this.stats.extractedFiles} success, ${this.stats.failedFiles} failed`);
    }

    /**
     * Extract source code for individual component
     */
    async extractComponentSource(component) {
        const url = `${this.baseUrls.raw}/${component.filePath}`;
        const response = await this.makeRawRequest(url);
        return response;
    }

    /**
     * Process component source code and extract metadata
     */
    processComponentSource(component, sourceCode) {
        return {
            ...component,
            sourceCode: sourceCode,
            fileSize: Buffer.byteLength(sourceCode, 'utf8'),
            dependencies: this.extractDependencies(sourceCode),
            exports: this.extractExports(sourceCode),
            imports: this.extractImports(sourceCode),
            typeDefinitions: this.extractTypeDefinitions(sourceCode),
            propsInterface: this.extractPropsInterface(sourceCode),
            hooks: this.extractHooks(sourceCode),
            features: this.analyzeFeatures(sourceCode),
            complexity: this.analyzeComplexity(sourceCode),
            stylingApproach: this.analyzeStyling(sourceCode),
            hasAnimation: this.hasAnimationFeatures(sourceCode),
            extractedAt: new Date().toISOString()
        };
    }

    /**
     * Extract dependencies from source code
     */
    extractDependencies(sourceCode) {
        const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))?\s*from\s+['"]([^'"]+)['"]/g;
        const dependencies = [];
        let match;

        while ((match = importRegex.exec(sourceCode)) !== null) {
            dependencies.push(match[1]);
        }

        return [...new Set(dependencies)];
    }

    /**
     * Extract exports from source code
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
     * Extract imports with details
     */
    extractImports(sourceCode) {
        const importRegex = /import\s+((?:{[^}]*}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))*)\s+from\s+['"]([^'"]+)['"]/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(sourceCode)) !== null) {
            imports.push({
                statement: match[1].trim(),
                from: match[2],
                isExternal: !match[2].startsWith('.') && !match[2].startsWith('/')
            });
        }

        return imports;
    }

    /**
     * Extract TypeScript type definitions
     */
    extractTypeDefinitions(sourceCode) {
        const typeRegex = /((?:interface|type)\s+\w+[^{=]*(?:{[^}]*}|=[^;]+;?))/g;
        const types = [];
        let match;

        while ((match = typeRegex.exec(sourceCode)) !== null) {
            types.push(match[1].trim());
        }

        return types;
    }

    /**
     * Extract props interface
     */
    extractPropsInterface(sourceCode) {
        const propsRegex = /interface\s+(\w*Props?)\s*{([^}]*)}/g;
        const interfaces = [];
        let match;

        while ((match = propsRegex.exec(sourceCode)) !== null) {
            interfaces.push({
                name: match[1],
                properties: match[2].trim().split('\n').map(line => line.trim()).filter(line => line)
            });
        }

        return interfaces;
    }

    /**
     * Extract React hooks usage
     */
    extractHooks(sourceCode) {
        const hookRegex = /use[A-Z]\w*/g;
        const hooks = [];
        let match;

        while ((match = hookRegex.exec(sourceCode)) !== null) {
            hooks.push(match[0]);
        }

        return [...new Set(hooks)];
    }

    /**
     * Analyze component features
     */
    analyzeFeatures(sourceCode) {
        const features = [];

        if (/useState|useReducer/.test(sourceCode)) features.push('stateful');
        if (/useEffect/.test(sourceCode)) features.push('side-effects');
        if (/useCallback|useMemo/.test(sourceCode)) features.push('performance-optimized');
        if (/@keyframes|animate|transition/.test(sourceCode)) features.push('animated');
        if (/forwardRef/.test(sourceCode)) features.push('ref-forwarding');
        if (/interface.*Props/.test(sourceCode)) features.push('typescript');
        if (/onClick|onSubmit|onChange|onFocus|onBlur/.test(sourceCode)) features.push('interactive');
        if (/useContext/.test(sourceCode)) features.push('context-aware');
        if (/Portal/.test(sourceCode)) features.push('portal-based');

        return features;
    }

    /**
     * Analyze component complexity
     */
    analyzeComplexity(sourceCode) {
        const lines = sourceCode.split('\n').length;
        const dependencies = (sourceCode.match(/import/g) || []).length;
        const hooks = (sourceCode.match(/use[A-Z]\w*/g) || []).length;
        const conditionals = (sourceCode.match(/if\s*\(|switch\s*\(|\?\s*:/g) || []).length;

        let level = 'simple';
        const score = lines * 0.1 + dependencies * 2 + hooks * 3 + conditionals * 1.5;

        if (score > 50) level = 'complex';
        else if (score > 20) level = 'moderate';

        return {
            level,
            score: Math.round(score),
            metrics: { lines, dependencies, hooks, conditionals }
        };
    }

    /**
     * Analyze styling approach
     */
    analyzeStyling(sourceCode) {
        const approaches = [];

        if (/tailwind|tw-|@apply/.test(sourceCode)) approaches.push('tailwind');
        if (/styled-components|styled\./.test(sourceCode)) approaches.push('styled-components');
        if (/emotion|@emotion/.test(sourceCode)) approaches.push('emotion');
        if (/\.module\.(css|scss|sass)/.test(sourceCode)) approaches.push('css-modules');
        if (/className.*{.*}/.test(sourceCode)) approaches.push('css-in-js');
        if (/style={{/.test(sourceCode)) approaches.push('inline-styles');

        return approaches.length > 0 ? approaches : ['css-classes'];
    }

    /**
     * Check for animation features
     */
    hasAnimationFeatures(sourceCode) {
        return /framer-motion|@keyframes|animate|transition|spring|gesture|lottie|three|gsap/.test(sourceCode);
    }

    /**
     * Enrich with website data
     */
    async enrichWithWebsiteData() {
        try {
            const websiteData = await this.scrapeWebsiteData();
            this.extractedData.websiteData = websiteData;
            
            // Match website components with extracted components
            this.matchWebsiteComponents(websiteData);
            
            console.log('✅ Website data enrichment completed');
        } catch (error) {
            console.warn('⚠️  Website data enrichment failed:', error.message);
            this.extractedData.websiteData = { error: error.message };
        }
    }

    /**
     * Scrape website data
     */
    async scrapeWebsiteData() {
        const url = this.baseUrls.website;
        const html = await this.makeWebRequest(url);
        
        return {
            title: this.extractFromHtml(html, /<title[^>]*>([^<]+)<\/title>/i),
            description: this.extractFromHtml(html, /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i),
            componentCount: this.extractFromHtml(html, /(\d+)\+?\s*components?/i),
            categories: this.extractCategoriesFromWebsite(html),
            scrapedAt: new Date().toISOString()
        };
    }

    /**
     * Extract categories from website HTML
     */
    extractCategoriesFromWebsite(html) {
        const categories = [];
        const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            const text = match[2].trim();
            
            if (this.isComponentCategory(text, href)) {
                categories.push({
                    name: text,
                    url: href.startsWith('/') ? this.baseUrls.website + href : href
                });
            }
        }

        return categories;
    }

    /**
     * Check if text/href represents a component category
     */
    isComponentCategory(text, href) {
        const keywords = ['button', 'text', 'animation', 'form', 'nav', 'component'];
        return keywords.some(keyword => 
            text.toLowerCase().includes(keyword) || href.toLowerCase().includes(keyword)
        );
    }

    /**
     * Extract text using regex from HTML
     */
    extractFromHtml(html, regex) {
        const match = html.match(regex);
        return match ? match[1].trim() : null;
    }

    /**
     * Match website components with extracted components
     */
    matchWebsiteComponents(websiteData) {
        // This would implement matching logic between website and GitHub data
        // For now, just add website metadata to components
        this.extractedData.components.forEach(component => {
            component.websiteMatch = {
                hasWebsiteInfo: websiteData.categories.length > 0,
                websiteUrl: this.baseUrls.website
            };
        });
    }

    /**
     * Extract utility files
     */
    async extractUtilities() {
        const utilities = [];
        const utilityPatterns = [/utils?/i, /helpers?/i, /hooks?/i, /lib/i, /constants?/i];

        for (const [dirPath, contents] of Object.entries(this.extractedData.repositoryStructure)) {
            if (!Array.isArray(contents)) continue;

            const isUtilityDir = utilityPatterns.some(pattern => pattern.test(dirPath));
            
            for (const item of contents) {
                if (item.type === 'file' && (isUtilityDir || this.isUtilityFile(item.name))) {
                    try {
                        const sourceCode = await this.extractComponentSource(item);
                        utilities.push({
                            name: item.name,
                            filePath: item.path,
                            directory: dirPath,
                            sourceCode: sourceCode,
                            fileSize: Buffer.byteLength(sourceCode, 'utf8'),
                            dependencies: this.extractDependencies(sourceCode),
                            exports: this.extractExports(sourceCode),
                            extractedAt: new Date().toISOString()
                        });
                        
                        console.log(`   ✅ Extracted utility: ${item.name}`);
                    } catch (error) {
                        console.warn(`   ⚠️  Failed utility: ${item.name}`);
                    }
                }
            }
        }

        this.extractedData.utilities = utilities;
        console.log(`✅ Extracted ${utilities.length} utility files`);
    }

    /**
     * Check if file is a utility file
     */
    isUtilityFile(filename) {
        const utilityExtensions = /\.(ts|js)$/i;
        const utilityPatterns = /utils?|helpers?|constants?|types?|config/i;
        const excludePatterns = /\.test\.|\.spec\.|\.d\.ts/i;
        
        return utilityExtensions.test(filename) && 
               utilityPatterns.test(filename) && 
               !excludePatterns.test(filename);
    }

    /**
     * Save individual component to file
     */
    async saveComponent(component) {
        const categoryDir = path.join(this.options.outputDir, 'components', component.category);
        await this.ensureDirectory(categoryDir);

        const filename = `${component.name.replace(/\s+/g, '-').toLowerCase()}.json`;
        const filepath = path.join(categoryDir, filename);

        const componentData = {
            metadata: {
                name: component.name,
                category: component.category,
                variant: component.variant,
                priority: component.priority,
                extractedAt: component.extractedAt
            },
            source: {
                filePath: component.filePath,
                sourceCode: component.sourceCode,
                fileSize: component.fileSize
            },
            analysis: {
                dependencies: component.dependencies,
                exports: component.exports,
                imports: component.imports,
                hooks: component.hooks,
                features: component.features,
                complexity: component.complexity,
                stylingApproach: component.stylingApproach,
                hasAnimation: component.hasAnimation
            },
            types: {
                definitions: component.typeDefinitions,
                propsInterface: component.propsInterface
            }
        };

        await fs.writeFile(filepath, JSON.stringify(componentData, null, 2), 'utf8');
    }

    /**
     * Generate comprehensive extraction report
     */
    async generateComprehensiveReport() {
        const endTime = Date.now();
        const duration = endTime - this.stats.startTime;

        const report = {
            metadata: {
                version: '1.0.0',
                extractorType: 'production',
                repository: 'https://github.com/DavidHDev/react-bits',
                extractedAt: new Date().toISOString(),
                duration: `${Math.round(duration / 1000)}s`,
                outputDirectory: this.options.outputDir
            },
            statistics: {
                execution: {
                    totalFiles: this.stats.totalFiles,
                    extractedFiles: this.stats.extractedFiles,
                    failedFiles: this.stats.failedFiles,
                    successRate: `${Math.round((this.stats.extractedFiles / this.stats.totalFiles) * 100)}%`,
                    utilitiesExtracted: this.extractedData.utilities.length
                },
                components: {
                    total: this.extractedData.components.length,
                    categories: Array.from(this.stats.componentCategories),
                    variants: Array.from(this.stats.variants),
                    byCategory: this.groupByCategory(),
                    byVariant: this.groupByVariant(),
                    byPriority: this.groupByPriority()
                },
                analysis: {
                    averageFileSize: this.calculateAverageFileSize(),
                    averageComplexity: this.calculateAverageComplexity(),
                    mostUsedDependencies: this.getMostUsedDependencies(),
                    stylingApproaches: this.getStylingApproachStats(),
                    animatedComponents: this.getAnimatedComponentCount()
                }
            },
            extraction: {
                repositoryStructure: Object.keys(this.extractedData.repositoryStructure).map(path => ({
                    path,
                    itemCount: this.extractedData.repositoryStructure[path].length
                })),
                priorityComponents: this.getPriorityComponents(),
                websiteData: this.extractedData.websiteData,
                errors: this.stats.errors
            },
            recommendations: this.generateRecommendations(),
            outputFiles: await this.getOutputFiles()
        };

        // Save comprehensive report
        const reportPath = path.join(this.options.outputDir, 'comprehensive-extraction-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

        // Save component index
        const indexPath = path.join(this.options.outputDir, 'component-index.json');
        const componentIndex = this.extractedData.components.map(c => ({
            name: c.name,
            category: c.category,
            variant: c.variant,
            priority: c.priority,
            filePath: c.filePath,
            features: c.features,
            hasAnimation: c.hasAnimation
        }));
        await fs.writeFile(indexPath, JSON.stringify(componentIndex, null, 2), 'utf8');

        console.log(`📄 Comprehensive report saved: ${reportPath}`);
        return report;
    }

    /**
     * Group components by category
     */
    groupByCategory() {
        const grouped = {};
        this.extractedData.components.forEach(c => {
            grouped[c.category] = (grouped[c.category] || 0) + 1;
        });
        return grouped;
    }

    /**
     * Group components by variant
     */
    groupByVariant() {
        const grouped = {};
        this.extractedData.components.forEach(c => {
            grouped[c.variant] = (grouped[c.variant] || 0) + 1;
        });
        return grouped;
    }

    /**
     * Group components by priority
     */
    groupByPriority() {
        const high = this.extractedData.components.filter(c => c.priority > 8).length;
        const medium = this.extractedData.components.filter(c => c.priority >= 5 && c.priority <= 8).length;
        const low = this.extractedData.components.filter(c => c.priority < 5).length;
        
        return { high, medium, low };
    }

    /**
     * Calculate average file size
     */
    calculateAverageFileSize() {
        const components = this.extractedData.components.filter(c => c.fileSize);
        if (components.length === 0) return 0;
        
        const total = components.reduce((sum, c) => sum + c.fileSize, 0);
        return Math.round(total / components.length);
    }

    /**
     * Calculate average complexity
     */
    calculateAverageComplexity() {
        const components = this.extractedData.components.filter(c => c.complexity);
        if (components.length === 0) return 0;
        
        const total = components.reduce((sum, c) => sum + c.complexity.score, 0);
        return Math.round(total / components.length);
    }

    /**
     * Get most used dependencies
     */
    getMostUsedDependencies() {
        const depCount = {};
        this.extractedData.components.forEach(c => {
            if (c.dependencies) {
                c.dependencies.forEach(dep => {
                    depCount[dep] = (depCount[dep] || 0) + 1;
                });
            }
        });
        
        return Object.entries(depCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([dep, count]) => ({ dependency: dep, count }));
    }

    /**
     * Get styling approach statistics
     */
    getStylingApproachStats() {
        const approachCount = {};
        this.extractedData.components.forEach(c => {
            if (c.stylingApproach) {
                c.stylingApproach.forEach(approach => {
                    approachCount[approach] = (approachCount[approach] || 0) + 1;
                });
            }
        });
        return approachCount;
    }

    /**
     * Get animated component count
     */
    getAnimatedComponentCount() {
        return this.extractedData.components.filter(c => c.hasAnimation).length;
    }

    /**
     * Get priority components
     */
    getPriorityComponents() {
        return this.extractedData.components
            .filter(c => c.priority > 8)
            .slice(0, 20)
            .map(c => ({
                name: c.name,
                category: c.category,
                priority: c.priority,
                variant: c.variant,
                features: c.features,
                complexity: c.complexity?.level
            }));
    }

    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const stats = this.stats;
        const components = this.extractedData.components;

        // Success rate recommendations
        const successRate = (stats.extractedFiles / stats.totalFiles) * 100;
        if (successRate > 90) {
            recommendations.push({
                type: 'success',
                message: `Excellent extraction rate: ${Math.round(successRate)}% of components successfully extracted`
            });
        } else if (successRate > 70) {
            recommendations.push({
                type: 'warning',
                message: `Good extraction rate: ${Math.round(successRate)}% - review failed extractions for manual processing`
            });
        } else {
            recommendations.push({
                type: 'error',
                message: `Low extraction rate: ${Math.round(successRate)}% - significant manual intervention may be required`
            });
        }

        // High priority component recommendations
        const highPriority = components.filter(c => c.priority > 8);
        if (highPriority.length > 0) {
            recommendations.push({
                type: 'info',
                message: `${highPriority.length} high-priority components identified (animated text, buttons, 3D) - prioritize these for integration`
            });
        }

        // Variant diversity
        const variants = Array.from(this.stats.variants);
        if (variants.includes('ts-tailwind')) {
            recommendations.push({
                type: 'success',
                message: 'TypeScript + Tailwind components available - recommended for modern React projects'
            });
        }

        // Animation components
        const animatedCount = this.getAnimatedComponentCount();
        if (animatedCount > 0) {
            recommendations.push({
                type: 'highlight',
                message: `${animatedCount} components with animation features - excellent for creating engaging UIs`
            });
        }

        return recommendations;
    }

    /**
     * Get list of output files
     */
    async getOutputFiles() {
        const files = [];
        
        try {
            await this.walkDirectory(this.options.outputDir, files);
        } catch (error) {
            console.warn('Could not list output files:', error.message);
        }
        
        return files;
    }

    /**
     * Recursively walk directory to list files
     */
    async walkDirectory(dir, files) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                await this.walkDirectory(fullPath, files);
            } else {
                const stats = await fs.stat(fullPath);
                files.push({
                    name: entry.name,
                    path: fullPath.replace(this.options.outputDir + '/', ''),
                    size: stats.size,
                    type: path.extname(entry.name) || 'file'
                });
            }
        }
    }

    /**
     * Print final summary
     */
    printFinalSummary(report) {
        console.log('\n📋 EXTRACTION SUMMARY');
        console.log('═'.repeat(60));
        console.log(`Repository: React Bits (DavidHDev)`);
        console.log(`Duration: ${report.metadata.duration}`);
        console.log('');
        console.log('📊 STATISTICS:');
        console.log(`  Components: ${report.statistics.components.total}`);
        console.log(`  Categories: ${report.statistics.components.categories.length}`);
        console.log(`  Variants: ${report.statistics.components.variants.length}`);
        console.log(`  Utilities: ${report.statistics.execution.utilitiesExtracted}`);
        console.log(`  Success Rate: ${report.statistics.execution.successRate}`);
        console.log('');
        console.log('🎯 PRIORITY BREAKDOWN:');
        console.log(`  High Priority: ${report.statistics.components.byPriority.high}`);
        console.log(`  Medium Priority: ${report.statistics.components.byPriority.medium}`);
        console.log(`  Low Priority: ${report.statistics.components.byPriority.low}`);
        console.log('');
        console.log('✨ HIGHLIGHTS:');
        console.log(`  Animated Components: ${report.statistics.analysis.animatedComponents}`);
        console.log(`  Average File Size: ${report.statistics.analysis.averageFileSize} bytes`);
        console.log(`  Top Dependency: ${report.statistics.analysis.mostUsedDependencies[0]?.dependency || 'N/A'}`);
        console.log('');
        console.log(`📂 Output Directory: ${report.metadata.outputDirectory}`);
        console.log('═'.repeat(60));
    }

    // Utility methods
    async makeGitHubRequest(url) {
        return this.makeRequest(url, {
            'Accept': 'application/vnd.github.v3+json'
        });
    }

    async makeRawRequest(url) {
        const response = await this.makeRequest(url, {
            'Accept': '*/*'
        }, true);
        return response;
    }

    async makeWebRequest(url) {
        return this.makeRequest(url, {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }, true);
    }

    async makeRequest(url, headers = {}, returnRaw = false) {
        const maxRetries = this.options.maxRetries;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.delay(this.options.requestDelay);
                
                const response = await this.httpRequest(url, {
                    headers: {
                        'User-Agent': this.options.userAgent,
                        ...headers
                    }
                });

                if (response.statusCode === 200) {
                    return returnRaw ? response.body : JSON.parse(response.body);
                } else if (response.statusCode === 403) {
                    // Rate limit handling
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
                    await this.delay(this.options.retryDelay * attempt);
                }
            }
        }

        throw lastError;
    }

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
                res.setEncoding('utf8');
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

            req.end();
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }
}

// Export for use as module
module.exports = ProductionReactBitsScraper;

// CLI execution
if (require.main === module) {
    const scraper = new ProductionReactBitsScraper({
        outputDir: './production-react-bits-extraction',
        maxConcurrent: 2,
        requestDelay: 2000, // Be respectful to GitHub API
        includeUtilities: true,
        extractAllVariants: true,
        generateUsageExamples: true
    });

    scraper.extract().catch(error => {
        console.error('❌ Production extraction failed:', error.message);
        process.exit(1);
    });
}