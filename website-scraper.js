#!/usr/bin/env node

/**
 * React Bits Website Scraper
 * 
 * Complementary scraper to extract component information from reactbits.dev
 * This scraper focuses on getting component listings, categories, and demo code
 * that might not be available through the GitHub API
 */

const https = require('https');
const { URL } = require('url');
const fs = require('fs').promises;

class ReactBitsWebsiteScraper {
    constructor(options = {}) {
        this.baseUrl = 'https://reactbits.dev';
        this.options = {
            maxRetries: 3,
            retryDelay: 2000,
            requestDelay: 1000,
            outputDir: './website-data',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...options
        };

        this.componentCatalog = [];
        this.categories = [];
        this.scraped_data = {};
    }

    /**
     * HTTP request with proper headers to avoid bot detection
     */
    async makeRequest(url, options = {}) {
        const maxRetries = options.maxRetries || this.options.maxRetries;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.delay(this.options.requestDelay);
                
                const response = await this.httpRequest(url, {
                    headers: {
                        'User-Agent': this.options.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Cache-Control': 'max-age=0',
                        ...options.headers
                    }
                });

                if (response.statusCode === 200) {
                    return response;
                } else if (response.statusCode === 429) {
                    // Rate limited
                    console.log(`Rate limited. Waiting longer...`);
                    await this.delay(this.options.retryDelay * 2);
                    continue;
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
                
                // Handle different encodings
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
     * Scrape the main website to understand structure
     */
    async scrapeMainPage() {
        console.log('🏠 Scraping React Bits main page...');
        
        try {
            const response = await this.makeRequest(this.baseUrl);
            const html = response.body;
            
            // Extract component categories from navigation or main content
            const categories = this.extractCategories(html);
            const componentLinks = this.extractComponentLinks(html);
            const featuredComponents = this.extractFeaturedComponents(html);
            
            this.scraped_data.mainPage = {
                title: this.extractTitle(html),
                description: this.extractDescription(html),
                categories: categories,
                componentLinks: componentLinks,
                featuredComponents: featuredComponents,
                totalComponents: this.extractTotalComponentCount(html),
                scrapedAt: new Date().toISOString()
            };
            
            console.log(`✅ Main page scraped: ${categories.length} categories, ${componentLinks.length} component links`);
            return this.scraped_data.mainPage;
            
        } catch (error) {
            console.error('❌ Failed to scrape main page:', error.message);
            throw error;
        }
    }

    /**
     * Extract categories from HTML
     */
    extractCategories(html) {
        const categories = [];
        
        // Look for navigation items or category sections
        const categoryPatterns = [
            /<nav[^>]*>[\s\S]*?<\/nav>/gi,
            /<ul[^>]*class="[^"]*nav[^"]*"[^>]*>[\s\S]*?<\/ul>/gi,
            /<div[^>]*class="[^"]*categor[^"]*"[^>]*>[\s\S]*?<\/div>/gi
        ];
        
        for (const pattern of categoryPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const navHtml = match[0];
                const links = navHtml.match(/<a[^>]*href="[^"]*"[^>]*>([^<]+)<\/a>/gi) || [];
                
                links.forEach(link => {
                    const hrefMatch = link.match(/href="([^"]+)"/);
                    const textMatch = link.match(/>([^<]+)</);
                    
                    if (hrefMatch && textMatch) {
                        const href = hrefMatch[1];
                        const text = textMatch[1].trim();
                        
                        // Filter for component-related categories
                        if (this.isComponentCategory(text, href)) {
                            categories.push({
                                name: text,
                                url: href.startsWith('/') ? this.baseUrl + href : href,
                                type: 'category'
                            });
                        }
                    }
                });
            }
        }
        
        return [...new Map(categories.map(c => [c.name, c])).values()]; // Remove duplicates
    }

    /**
     * Check if a link represents a component category
     */
    isComponentCategory(text, href) {
        const componentKeywords = [
            'button', 'text', 'animation', 'card', 'form', 'nav', 'modal',
            'slider', 'tab', 'accordion', 'tooltip', 'dropdown', 'menu',
            'input', 'chart', 'calendar', 'badge', 'avatar', 'progress',
            'loading', 'spinner', 'alert', '3d', 'canvas', 'background'
        ];
        
        const textLower = text.toLowerCase();
        const hrefLower = href.toLowerCase();
        
        return componentKeywords.some(keyword => 
            textLower.includes(keyword) || hrefLower.includes(keyword)
        ) || /component|demo|example/.test(textLower);
    }

    /**
     * Extract component links from HTML
     */
    extractComponentLinks(html) {
        const links = [];
        const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;
        let match;

        while ((match = linkPattern.exec(html)) !== null) {
            const href = match[1];
            const text = match[2].replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
            
            if (this.isComponentLink(text, href)) {
                links.push({
                    title: text,
                    url: href.startsWith('/') ? this.baseUrl + href : href,
                    type: 'component'
                });
            }
        }
        
        return links;
    }

    /**
     * Check if a link points to a component
     */
    isComponentLink(text, href) {
        return /component|demo|example/.test(href.toLowerCase()) ||
               /component|demo|example/.test(text.toLowerCase());
    }

    /**
     * Extract featured components from main page
     */
    extractFeaturedComponents(html) {
        const featured = [];
        
        // Look for component showcases or featured sections
        const showcasePatterns = [
            /<section[^>]*class="[^"]*featured[^"]*"[^>]*>[\s\S]*?<\/section>/gi,
            /<div[^>]*class="[^"]*showcase[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*class="[^"]*demo[^"]*"[^>]*>[\s\S]*?<\/div>/gi
        ];
        
        for (const pattern of showcasePatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const sectionHtml = match[0];
                
                // Extract component names and descriptions
                const titleMatch = sectionHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
                const descMatch = sectionHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
                
                if (titleMatch) {
                    featured.push({
                        name: titleMatch[1].trim(),
                        description: descMatch ? descMatch[1].trim() : '',
                        html: sectionHtml
                    });
                }
            }
        }
        
        return featured;
    }

    /**
     * Extract page title
     */
    extractTitle(html) {
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return match ? match[1].trim() : 'React Bits';
    }

    /**
     * Extract page description
     */
    extractDescription(html) {
        const metaMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
        if (metaMatch) return metaMatch[1];
        
        const ogMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
        return ogMatch ? ogMatch[1] : '';
    }

    /**
     * Extract total component count if mentioned
     */
    extractTotalComponentCount(html) {
        const countPatterns = [
            /(\d+)\+?\s*components?/gi,
            /over\s*(\d+)\s*components?/gi,
            /(\d+)\s*total\s*components?/gi
        ];
        
        for (const pattern of countPatterns) {
            const match = pattern.exec(html);
            if (match) {
                return parseInt(match[1]);
            }
        }
        
        return null;
    }

    /**
     * Scrape component categories
     */
    async scrapeCategories() {
        console.log('📂 Scraping component categories...');
        
        const mainPageData = this.scraped_data.mainPage;
        if (!mainPageData || !mainPageData.categories) {
            throw new Error('Main page must be scraped first');
        }
        
        const categoryData = {};
        
        for (const category of mainPageData.categories) {
            try {
                console.log(`   Scraping category: ${category.name}`);
                
                const response = await this.makeRequest(category.url);
                const html = response.body;
                
                categoryData[category.name] = {
                    ...category,
                    components: this.extractComponentsFromCategoryPage(html),
                    description: this.extraPageDescription(html),
                    scrapedAt: new Date().toISOString()
                };
                
                console.log(`   ✅ ${category.name}: ${categoryData[category.name].components.length} components`);
                
            } catch (error) {
                console.warn(`   ⚠️  Failed to scrape category ${category.name}: ${error.message}`);
                categoryData[category.name] = {
                    ...category,
                    error: error.message,
                    scrapedAt: new Date().toISOString()
                };
            }
        }
        
        this.scraped_data.categories = categoryData;
        return categoryData;
    }

    /**
     * Extract components from a category page
     */
    extractComponentsFromCategoryPage(html) {
        const components = [];
        
        // Look for component cards, grids, or lists
        const componentPatterns = [
            /<div[^>]*class="[^"]*component[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<article[^>]*>[\s\S]*?<\/article>/gi,
            /<li[^>]*class="[^"]*component[^"]*"[^>]*>[\s\S]*?<\/li>/gi
        ];
        
        for (const pattern of componentPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const componentHtml = match[0];
                const component = this.parseComponentFromHtml(componentHtml);
                if (component) {
                    components.push(component);
                }
            }
        }
        
        return components;
    }

    /**
     * Parse individual component from HTML
     */
    parseComponentFromHtml(html) {
        const titleMatch = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
        const linkMatch = html.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
        const descMatch = html.match(/<p[^>]*>([^<]+)<\/p>/i);
        
        if (!titleMatch) return null;
        
        return {
            name: titleMatch[1].trim(),
            url: linkMatch ? (linkMatch[1].startsWith('/') ? this.baseUrl + linkMatch[1] : linkMatch[1]) : null,
            description: descMatch ? descMatch[1].trim() : '',
            html: html
        };
    }

    /**
     * Extract page description
     */
    extraPageDescription(html) {
        const match = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
        return match ? match[1] : '';
    }

    /**
     * Generate comprehensive website scraping report
     */
    async generateReport() {
        console.log('📊 Generating website scraping report...');
        
        await this.ensureDirectory(this.options.outputDir);
        
        const report = {
            metadata: {
                scraperVersion: '1.0.0',
                website: this.baseUrl,
                scrapedAt: new Date().toISOString(),
                userAgent: this.options.userAgent
            },
            summary: {
                categoriesScraped: this.scraped_data.categories ? Object.keys(this.scraped_data.categories).length : 0,
                totalComponentsFound: this.calculateTotalComponents(),
                featuredComponents: this.scraped_data.mainPage?.featuredComponents?.length || 0,
                errors: this.countErrors()
            },
            data: this.scraped_data,
            componentCatalog: this.buildComponentCatalog(),
            recommendations: this.generateRecommendations()
        };
        
        // Save report
        const reportPath = `${this.options.outputDir}/website-scraping-report.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
        
        // Save raw scraped data
        const dataPath = `${this.options.outputDir}/scraped-data.json`;
        await fs.writeFile(dataPath, JSON.stringify(this.scraped_data, null, 2), 'utf8');
        
        console.log(`📄 Report saved to: ${reportPath}`);
        return report;
    }

    /**
     * Calculate total components found across all categories
     */
    calculateTotalComponents() {
        if (!this.scraped_data.categories) return 0;
        
        return Object.values(this.scraped_data.categories).reduce((total, category) => {
            return total + (category.components ? category.components.length : 0);
        }, 0);
    }

    /**
     * Count scraping errors
     */
    countErrors() {
        if (!this.scraped_data.categories) return 0;
        
        return Object.values(this.scraped_data.categories).filter(category => category.error).length;
    }

    /**
     * Build unified component catalog
     */
    buildComponentCatalog() {
        const catalog = [];
        
        if (this.scraped_data.categories) {
            for (const [categoryName, categoryData] of Object.entries(this.scraped_data.categories)) {
                if (categoryData.components) {
                    categoryData.components.forEach(component => {
                        catalog.push({
                            ...component,
                            category: categoryName,
                            source: 'website'
                        });
                    });
                }
            }
        }
        
        return catalog;
    }

    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        const totalComponents = this.calculateTotalComponents();
        if (totalComponents > 0) {
            recommendations.push({
                type: 'success',
                message: `Successfully cataloged ${totalComponents} components from the website`
            });
        }
        
        const errorCount = this.countErrors();
        if (errorCount > 0) {
            recommendations.push({
                type: 'warning',
                message: `${errorCount} categories failed to scrape - consider manual review`
            });
        }
        
        if (this.scraped_data.mainPage?.totalComponents) {
            const claimed = this.scraped_data.mainPage.totalComponents;
            const found = totalComponents;
            if (found < claimed * 0.8) {
                recommendations.push({
                    type: 'info',
                    message: `Found ${found} components but website claims ${claimed} - some may be behind navigation or require JS rendering`
                });
            }
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
     * Main scraping process
     */
    async scrape() {
        try {
            console.log('🚀 Starting React Bits website scraping...');
            
            // Step 1: Scrape main page
            await this.scrapeMainPage();
            
            // Step 2: Scrape categories
            await this.scrapeCategories();
            
            // Step 3: Generate report
            const report = await this.generateReport();
            
            console.log('\n🎉 Website scraping completed!');
            console.log(`📊 Categories scraped: ${report.summary.categoriesScraped}`);
            console.log(`📦 Components found: ${report.summary.totalComponentsFound}`);
            console.log(`❌ Errors: ${report.summary.errors}`);
            
            return report;
            
        } catch (error) {
            console.error('💥 Website scraping failed:', error.message);
            throw error;
        }
    }
}

// Export for use as module
module.exports = ReactBitsWebsiteScraper;

// CLI execution
if (require.main === module) {
    const scraper = new ReactBitsWebsiteScraper({
        outputDir: './website-scraped-data',
        requestDelay: 2000, // Be respectful
        maxRetries: 3
    });

    scraper.scrape().catch(error => {
        console.error('❌ Website scraping failed:', error.message);
        process.exit(1);
    });
}