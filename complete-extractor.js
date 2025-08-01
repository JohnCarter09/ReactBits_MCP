#!/usr/bin/env node

/**
 * Complete React Bits Extractor
 * 
 * Orchestrates both GitHub API extraction and website scraping to provide
 * comprehensive component source code and metadata extraction
 */

const ReactBitsExtractor = require('./react-bits-extractor');
const ReactBitsWebsiteScraper = require('./website-scraper');
const fs = require('fs').promises;
const path = require('path');

class CompleteReactBitsExtractor {
    constructor(options = {}) {
        this.options = {
            outputDir: './complete-extraction',
            includeWebsiteData: true,
            includeSourceCode: true,
            prioritizeComponents: true,
            maxComponents: null, // null = extract all
            requestDelay: 1500,
            ...options
        };

        this.githubExtractor = new ReactBitsExtractor({
            outputDir: path.join(this.options.outputDir, 'github-data'),
            requestDelay: this.options.requestDelay,
            includeUtilities: true,
            extractAllVariants: true
        });

        this.websiteScraper = new ReactBitsWebsiteScraper({
            outputDir: path.join(this.options.outputDir, 'website-data'),
            requestDelay: this.options.requestDelay
        });

        this.mergedData = {
            components: [],
            utilities: [],
            metadata: {},
            statistics: {}
        };
    }

    /**
     * Execute complete extraction process
     */
    async extract() {
        console.log('🚀 Starting Complete React Bits Extraction...');
        console.log(`📂 Output directory: ${this.options.outputDir}\n`);

        const startTime = Date.now();

        try {
            // Create output directory
            await this.ensureDirectory(this.options.outputDir);

            // Step 1: GitHub API extraction
            console.log('📋 PHASE 1: GitHub Repository Extraction');
            const githubReport = await this.githubExtractor.extract();

            // Step 2: Website scraping (if enabled)
            let websiteReport = null;
            if (this.options.includeWebsiteData) {
                console.log('\n🌐 PHASE 2: Website Data Scraping');
                websiteReport = await this.websiteScraper.scrape();
            }

            // Step 3: Data merging and analysis
            console.log('\n🔄 PHASE 3: Data Merging and Analysis');
            await this.mergeAndAnalyzeData(githubReport, websiteReport);

            // Step 4: Priority component processing
            if (this.options.prioritizeComponents) {
                console.log('\n🎯 PHASE 4: Priority Component Processing');
                await this.processPriorityComponents();
            }

            // Step 5: Generate comprehensive report
            console.log('\n📊 PHASE 5: Comprehensive Report Generation');
            const finalReport = await this.generateFinalReport(githubReport, websiteReport, startTime);

            console.log('\n🎉 Complete extraction finished successfully!');
            this.printSummary(finalReport);

            return finalReport;

        } catch (error) {
            console.error('\n💥 Complete extraction failed:', error.message);
            throw error;
        }
    }

    /**
     * Merge data from GitHub and website sources
     */
    async mergeAndAnalyzeData(githubReport, websiteReport) {
        console.log('🔄 Merging GitHub and website data...');

        // Merge component data
        const githubComponents = this.githubExtractor.componentData || [];
        const websiteComponents = websiteReport ? this.buildWebsiteComponentList(websiteReport) : [];

        // Create unified component list with cross-references
        const mergedComponents = this.mergeComponentLists(githubComponents, websiteComponents);

        // Analyze component completeness
        const analysisResults = this.analyzeComponentCompleteness(mergedComponents);

        this.mergedData = {
            components: mergedComponents,
            utilities: githubReport.utilities || [],
            githubStats: githubReport.statistics,
            websiteStats: websiteReport ? websiteReport.summary : null,
            analysis: analysisResults,
            mergedAt: new Date().toISOString()
        };

        console.log(`✅ Merged ${mergedComponents.length} components from both sources`);
        return this.mergedData;
    }

    /**
     * Build component list from website scraping results
     */
    buildWebsiteComponentList(websiteReport) {
        const components = [];

        if (websiteReport.componentCatalog) {
            websiteReport.componentCatalog.forEach(comp => {
                components.push({
                    name: comp.name,
                    category: comp.category,
                    description: comp.description,
                    websiteUrl: comp.url,
                    source: 'website',
                    priority: this.calculateWebsitePriority(comp)
                });
            });
        }

        return components;
    }

    /**
     * Calculate priority for website components
     */
    calculateWebsitePriority(component) {
        let priority = 1;
        const name = component.name.toLowerCase();
        const category = component.category.toLowerCase();

        // High priority patterns
        if (/animated.*text|text.*animat/.test(name) || /animated.*text|text.*animat/.test(category)) priority += 10;
        if (/button|btn/.test(name) || /button/.test(category)) priority += 9;
        if (/3d|three|webgl|canvas/.test(name) || /3d|three/.test(category)) priority += 8;
        if (/animat|motion/.test(name) || /animat/.test(category)) priority += 5;

        return priority;
    }

    /**
     * Merge component lists from different sources
     */
    mergeComponentLists(githubComponents, websiteComponents) {
        const merged = [];
        const processedNames = new Set();

        // Process GitHub components first (they have source code)
        githubComponents.forEach(githubComp => {
            const normalizedName = this.normalizeComponentName(githubComp.name);
            
            // Find matching website component
            const websiteMatch = websiteComponents.find(webComp => 
                this.normalizeComponentName(webComp.name) === normalizedName
            );

            merged.push({
                ...githubComp,
                websiteData: websiteMatch || null,
                hasSourceCode: true,
                hasWebsiteInfo: !!websiteMatch,
                mergedPriority: githubComp.priority + (websiteMatch?.priority || 0)
            });

            processedNames.add(normalizedName);
        });

        // Add website-only components
        websiteComponents.forEach(webComp => {
            const normalizedName = this.normalizeComponentName(webComp.name);
            
            if (!processedNames.has(normalizedName)) {
                merged.push({
                    name: webComp.name,
                    category: webComp.category,
                    description: webComp.description,
                    websiteData: webComp,
                    hasSourceCode: false,
                    hasWebsiteInfo: true,
                    mergedPriority: webComp.priority,
                    sourceCodeStatus: 'missing'
                });
            }
        });

        // Sort by merged priority
        return merged.sort((a, b) => b.mergedPriority - a.mergedPriority);
    }

    /**
     * Normalize component name for matching
     */
    normalizeComponentName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/component$/i, '')
            .trim();
    }

    /**
     * Analyze component completeness
     */
    analyzeComponentCompleteness(components) {
        const analysis = {
            total: components.length,
            withSourceCode: components.filter(c => c.hasSourceCode).length,
            withWebsiteInfo: components.filter(c => c.hasWebsiteInfo).length,
            complete: components.filter(c => c.hasSourceCode && c.hasWebsiteInfo).length,
            sourceCodeOnly: components.filter(c => c.hasSourceCode && !c.hasWebsiteInfo).length,
            websiteOnly: components.filter(c => !c.hasSourceCode && c.hasWebsiteInfo).length,
            byCategory: {},
            byVariant: {},
            priorityBreakdown: {
                high: components.filter(c => c.mergedPriority > 10).length,
                medium: components.filter(c => c.mergedPriority >= 5 && c.mergedPriority <= 10).length,
                low: components.filter(c => c.mergedPriority < 5).length
            }
        };

        // Group by category
        components.forEach(comp => {
            const category = comp.category || 'uncategorized';
            if (!analysis.byCategory[category]) {
                analysis.byCategory[category] = { total: 0, withSource: 0, withWebsite: 0 };
            }
            analysis.byCategory[category].total++;
            if (comp.hasSourceCode) analysis.byCategory[category].withSource++;
            if (comp.hasWebsiteInfo) analysis.byCategory[category].withWebsite++;
        });

        // Group by variant (for GitHub components)
        components.filter(c => c.variant).forEach(comp => {
            if (!analysis.byVariant[comp.variant]) {
                analysis.byVariant[comp.variant] = 0;
            }
            analysis.byVariant[comp.variant]++;
        });

        return analysis;
    }

    /**
     * Process priority components with enhanced metadata
     */
    async processPriorityComponents() {
        console.log('🎯 Processing priority components...');

        const priorityComponents = this.mergedData.components
            .filter(c => c.mergedPriority > 8)
            .slice(0, this.options.maxComponents || 50);

        const processed = [];

        for (const component of priorityComponents) {
            try {
                const enhanced = await this.enhanceComponentData(component);
                processed.push(enhanced);
                console.log(`   ✅ Enhanced: ${component.name} (priority: ${component.mergedPriority})`);
            } catch (error) {
                console.warn(`   ⚠️  Failed to enhance ${component.name}: ${error.message}`);
                processed.push(component);
            }
        }

        // Save priority components separately
        const priorityPath = path.join(this.options.outputDir, 'priority-components.json');
        await fs.writeFile(priorityPath, JSON.stringify(processed, null, 2), 'utf8');

        console.log(`✅ Processed ${processed.length} priority components`);
        return processed;
    }

    /**
     * Enhance component data with additional analysis
     */
    async enhanceComponentData(component) {
        const enhanced = { ...component };

        if (component.hasSourceCode && component.sourceCode) {
            // Analyze component complexity
            enhanced.complexity = this.analyzeComponentComplexity(component.sourceCode);
            
            // Extract component features
            enhanced.features = this.extractComponentFeatures(component.sourceCode);
            
            // Analyze styling approach
            enhanced.stylingApproach = this.analyzeStylingApproach(component.sourceCode);
            
            // Extract example usage
            enhanced.exampleUsage = this.extractExampleUsage(component.sourceCode);
        }

        return enhanced;
    }

    /**
     * Analyze component complexity
     */
    analyzeComponentComplexity(sourceCode) {
        const metrics = {
            linesOfCode: sourceCode.split('\n').length,
            dependencies: (sourceCode.match(/import\s+/g) || []).length,
            hooks: (sourceCode.match(/use[A-Z]\w*/g) || []).length,
            stateVariables: (sourceCode.match(/useState|useReducer/g) || []).length,
            effects: (sourceCode.match(/useEffect/g) || []).length,
            customHooks: (sourceCode.match(/use[A-Z][a-zA-Z]*/g) || []).filter(hook => 
                !['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo'].includes(hook)
            ).length
        };

        let complexity = 'simple';
        if (metrics.linesOfCode > 100 || metrics.dependencies > 5 || metrics.hooks > 3) {
            complexity = 'complex';
        } else if (metrics.linesOfCode > 50 || metrics.dependencies > 3 || metrics.hooks > 1) {
            complexity = 'moderate';
        }

        return { level: complexity, metrics };
    }

    /**
     * Extract component features
     */
    extractComponentFeatures(sourceCode) {
        const features = [];

        if (/useState|useReducer/.test(sourceCode)) features.push('stateful');
        if (/useEffect/.test(sourceCode)) features.push('side-effects');
        if (/useCallback|useMemo/.test(sourceCode)) features.push('optimized');
        if /@keyframes|animation:|transition:/.test(sourceCode)) features.push('animated');
        if (/forwardRef/.test(sourceCode)) features.push('ref-forwarding');
        if (/interface\s+\w*Props/.test(sourceCode)) features.push('typescript');
        if (/className=|style=/.test(sourceCode)) features.push('styled');
        if (/onClick|onSubmit|onChange/.test(sourceCode)) features.push('interactive');

        return features;
    }

    /**
     * Analyze styling approach
     */
    analyzeStylingApproach(sourceCode) {
        const approaches = [];

        if (/tailwind|tw-|@apply/.test(sourceCode)) approaches.push('tailwind');
        if (/styled-components|styled\(/.test(sourceCode)) approaches.push('styled-components');
        if (/import.*\.css|import.*\.scss/.test(sourceCode)) approaches.push('css-modules');
        if (/className=/.test(sourceCode) && !/tailwind/.test(sourceCode)) approaches.push('css-classes');
        if (/style={{/.test(sourceCode)) approaches.push('inline-styles');

        return approaches.length > 0 ? approaches : ['unknown'];
    }

    /**
     * Extract example usage from comments or docstrings
     */
    extractExampleUsage(sourceCode) {
        const examples = [];
        
        // Look for JSDoc examples
        const jsdocMatches = sourceCode.match(/@example\s*([\s\S]*?)(?=\*\/|\*\s*@)/g);
        if (jsdocMatches) {
            jsdocMatches.forEach(match => {
                const example = match.replace(/@example\s*/, '').trim();
                examples.push(example);
            });
        }

        // Look for usage comments
        const usageMatches = sourceCode.match(/\/\*\*?\s*Usage:?\s*([\s\S]*?)\*\//gi);
        if (usageMatches) {
            usageMatches.forEach(match => {
                const usage = match.replace(/\/\*\*?\s*Usage:?\s*|\*\//gi, '').trim();
                examples.push(usage);
            });
        }

        return examples;
    }

    /**
     * Generate comprehensive final report
     */
    async generateFinalReport(githubReport, websiteReport, startTime) {
        console.log('📊 Generating final comprehensive report...');

        const endTime = Date.now();
        const duration = endTime - startTime;

        const report = {
            metadata: {
                version: '1.0.0',
                extractorType: 'complete',
                extractedAt: new Date().toISOString(),
                duration: `${Math.round(duration / 1000)}s`,
                outputDirectory: this.options.outputDir,
                sources: {
                    github: true,
                    website: !!websiteReport
                }
            },
            extraction: {
                github: {
                    success: githubReport.statistics.extractedFiles > 0,
                    componentsExtracted: githubReport.statistics.extractedFiles,
                    utilitiesExtracted: githubReport.utilities?.length || 0,
                    errors: githubReport.statistics.failedFiles
                },
                website: websiteReport ? {
                    success: websiteReport.summary.totalComponentsFound > 0,
                    categoriesScraped: websiteReport.summary.categoriesScraped,
                    componentsFound: websiteReport.summary.totalComponentsFound,
                    errors: websiteReport.summary.errors
                } : null
            },
            analysis: this.mergedData.analysis,
            recommendations: this.generateFinalRecommendations(),
            priorityComponents: this.getPriorityComponentSummary(),
            files: await this.getOutputFilesList()
        };

        // Save final report
        const reportPath = path.join(this.options.outputDir, 'final-extraction-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

        // Save merged data
        const mergedDataPath = path.join(this.options.outputDir, 'merged-component-data.json');
        await fs.writeFile(mergedDataPath, JSON.stringify(this.mergedData, null, 2), 'utf8');

        console.log(`📄 Final report saved to: ${reportPath}`);
        return report;
    }

    /**
     * Get priority component summary
     */
    getPriorityComponentSummary() {
        const priority = this.mergedData.components.filter(c => c.mergedPriority > 8);
        
        return {
            total: priority.length,
            withSourceCode: priority.filter(c => c.hasSourceCode).length,
            categories: [...new Set(priority.map(c => c.category))],
            top10: priority.slice(0, 10).map(c => ({
                name: c.name,
                category: c.category,
                priority: c.mergedPriority,
                hasSourceCode: c.hasSourceCode,
                hasWebsiteInfo: c.hasWebsiteInfo
            }))
        };
    }

    /**
     * Generate final recommendations
     */
    generateFinalRecommendations() {
        const recommendations = [];
        const analysis = this.mergedData.analysis;

        // Coverage recommendations
        const sourceCodeCoverage = (analysis.withSourceCode / analysis.total) * 100;
        if (sourceCodeCoverage > 80) {
            recommendations.push({
                type: 'success',
                message: `Excellent source code coverage: ${Math.round(sourceCodeCoverage)}% of components have extractable source code`
            });
        } else if (sourceCodeCoverage > 50) {
            recommendations.push({
                type: 'warning',
                message: `Moderate source code coverage: ${Math.round(sourceCodeCoverage)}% - consider manual extraction for missing components`
            });
        } else {
            recommendations.push({
                type: 'error',
                message: `Low source code coverage: ${Math.round(sourceCodeCoverage)}% - many components may require manual extraction`
            });
        }

        // Priority component recommendations
        if (analysis.priorityBreakdown.high > 0) {
            recommendations.push({
                type: 'success',
                message: `${analysis.priorityBreakdown.high} high-priority components identified for immediate integration`
            });
        }

        // Category recommendations
        const topCategory = Object.entries(analysis.byCategory)
            .sort(([,a], [,b]) => b.total - a.total)[0];
        
        if (topCategory) {
            recommendations.push({
                type: 'info',
                message: `Largest category is "${topCategory[0]}" with ${topCategory[1].total} components - good starting point for integration`
            });
        }

        return recommendations;
    }

    /**
     * Get list of output files
     */
    async getOutputFilesList() {
        const files = [];
        
        try {
            const entries = await fs.readdir(this.options.outputDir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isFile()) {
                    const filePath = path.join(this.options.outputDir, entry.name);
                    const stats = await fs.stat(filePath);
                    files.push({
                        name: entry.name,
                        path: filePath,
                        size: stats.size,
                        type: 'file'
                    });
                } else if (entry.isDirectory()) {
                    files.push({
                        name: entry.name,
                        path: path.join(this.options.outputDir, entry.name),
                        type: 'directory'
                    });
                }
            }
        } catch (error) {
            console.warn('Could not list output files:', error.message);
        }
        
        return files;
    }

    /**
     * Print extraction summary
     */
    printSummary(report) {
        console.log('\n📋 EXTRACTION SUMMARY');
        console.log('═'.repeat(50));
        
        if (report.extraction.github) {
            console.log(`GitHub Extraction:`);
            console.log(`  Components: ${report.extraction.github.componentsExtracted}`);
            console.log(`  Utilities: ${report.extraction.github.utilitiesExtracted}`);
            console.log(`  Errors: ${report.extraction.github.errors}`);
        }
        
        if (report.extraction.website) {
            console.log(`Website Scraping:`);
            console.log(`  Categories: ${report.extraction.website.categoriesScraped}`);
            console.log(`  Components: ${report.extraction.website.componentsFound}`);
            console.log(`  Errors: ${report.extraction.website.errors}`);
        }
        
        console.log(`\nMerged Analysis:`);
        console.log(`  Total Components: ${report.analysis.total}`);
        console.log(`  With Source Code: ${report.analysis.withSourceCode}`);
        console.log(`  With Website Info: ${report.analysis.withWebsiteInfo}`);
        console.log(`  Complete (both): ${report.analysis.complete}`);
        
        console.log(`\nPriority Components:`);
        console.log(`  High Priority: ${report.analysis.priorityBreakdown.high}`);
        console.log(`  Medium Priority: ${report.analysis.priorityBreakdown.medium}`);
        console.log(`  Low Priority: ${report.analysis.priorityBreakdown.low}`);
        
        console.log(`\nExecution Time: ${report.metadata.duration}`);
        console.log(`Output Directory: ${report.metadata.outputDirectory}`);
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
}

// Export for use as module
module.exports = CompleteReactBitsExtractor;

// CLI execution
if (require.main === module) {
    const extractor = new CompleteReactBitsExtractor({
        outputDir: './complete-react-bits-extraction',
        includeWebsiteData: true,
        includeSourceCode: true,
        prioritizeComponents: true,
        maxComponents: 100, // Limit for testing
        requestDelay: 2000 // Be respectful to servers
    });

    extractor.extract().catch(error => {
        console.error('❌ Complete extraction failed:', error.message);
        process.exit(1);
    });
}