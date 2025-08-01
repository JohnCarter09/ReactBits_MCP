#!/usr/bin/env node

/**
 * Example ReactBits.dev Scraper
 * Based on technical analysis findings - implements recommended patterns
 * 
 * This example demonstrates how to use the analysis results to build
 * a robust scraper for ReactBits.dev component data
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ReactBitsScraper {
    constructor() {
        // Anti-detection configuration based on analysis
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        
        this.viewports = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 }
        ];
        
        // Rate limiting - based on analysis recommendations
        this.requestDelay = 2000; // 2 seconds between requests
        this.pageDelay = 5000;    // 5 seconds between pages
        
        // Selectors based on analysis (will be updated after running analyzer)
        this.selectors = {
            navigation: [
                'nav a',
                '.nav-link',
                '[role="navigation"] a',
                'header a'
            ],
            components: [
                '[data-testid]',
                '.component',
                '.card',
                '.grid > div',
                'main > div',
                'section'
            ],
            titles: [
                'h1', 'h2', 'h3',
                '.title',
                '.heading',
                '.component-title'
            ],
            descriptions: [
                '.description',
                '.summary',
                'p',
                '.text'
            ],
            codeBlocks: [
                'pre code',
                '.code-block',
                '.highlight',
                'pre',
                '[data-language]'
            ],
            links: [
                'a[href]',
                '.link',
                '[role="link"]'
            ]
        };
        
        this.scrapedData = {
            homepage: {},
            components: [],
            navigation: [],
            metadata: {}
        };
    }

    /**
     * Setup browser with anti-detection measures
     */
    async setupBrowser() {
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        const viewport = this.viewports[Math.floor(Math.random() * this.viewports.length)];
        
        console.log('🚀 Setting up browser with stealth measures...');
        console.log(`📱 User Agent: ${userAgent.substring(0, 50)}...`);
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport(viewport);
        await page.setUserAgent(userAgent);
        
        // Additional headers for authenticity
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });
        
        // Stealth measures
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            window.chrome = { runtime: {} };
            delete window.webdriver;
        });

        return { browser, page };
    }

    /**
     * Safe selector evaluation with fallbacks
     */
    async safeQuerySelector(page, selectors, attribute = 'textContent') {
        for (const selector of selectors) {
            try {
                const result = await page.evaluate((sel, attr) => {
                    const elements = document.querySelectorAll(sel);
                    if (elements.length === 0) return null;
                    
                    if (attr === 'textContent') {
                        return Array.from(elements).map(el => el.textContent?.trim()).filter(Boolean);
                    } else if (attr === 'href') {
                        return Array.from(elements).map(el => el.href).filter(Boolean);
                    } else if (attr === 'src') {
                        return Array.from(elements).map(el => el.src).filter(Boolean);
                    } else {
                        return Array.from(elements).map(el => el.getAttribute(attr)).filter(Boolean);
                    }
                }, selector, attribute);
                
                if (result && result.length > 0) {
                    return { selector, data: result };
                }
            } catch (error) {
                console.log(`   ⚠️ Selector failed: ${selector} - ${error.message}`);
                continue;
            }
        }
        return null;
    }

    /**
     * Extract homepage data
     */
    async scrapeHomepage(page) {
        console.log('🏠 Scraping homepage...');
        
        try {
            await page.goto('https://reactbits.dev', { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // Wait for dynamic content
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const homepage = {
                title: await page.title(),
                url: page.url(),
                timestamp: new Date().toISOString()
            };
            
            // Extract navigation
            console.log('   📍 Extracting navigation...');
            const navigation = await this.safeQuerySelector(page, this.selectors.navigation);
            if (navigation) {
                const navLinks = await this.safeQuerySelector(page, this.selectors.navigation, 'href');
                homepage.navigation = {
                    labels: navigation.data,
                    links: navLinks ? navLinks.data : []
                };
            }
            
            // Extract main headings
            console.log('   📝 Extracting headings...');
            const headings = await this.safeQuerySelector(page, this.selectors.titles);
            if (headings) {
                homepage.headings = headings.data;
            }
            
            // Extract descriptions
            console.log('   📄 Extracting descriptions...');
            const descriptions = await this.safeQuerySelector(page, this.selectors.descriptions);
            if (descriptions) {
                homepage.descriptions = descriptions.data.slice(0, 5); // Limit to first 5
            }
            
            // Extract all links for component discovery
            console.log('   🔗 Extracting links for component discovery...');
            const allLinks = await this.safeQuerySelector(page, this.selectors.links, 'href');
            if (allLinks) {
                const componentLinks = allLinks.data.filter(link => 
                    link.includes('/component') || 
                    link.includes('/docs') ||
                    (link.includes('reactbits.dev') && link !== 'https://reactbits.dev/')
                );
                homepage.componentLinks = [...new Set(componentLinks)]; // Remove duplicates
            }
            
            // Extract component preview sections
            console.log('   🧩 Extracting component previews...');
            const components = await this.safeQuerySelector(page, this.selectors.components);
            if (components) {
                homepage.componentPreviews = components.data.slice(0, 10); // Limit to first 10
            }
            
            this.scrapedData.homepage = homepage;
            console.log(`   ✅ Homepage scraped: ${Object.keys(homepage).length} data points`);
            
            return homepage;
            
        } catch (error) {
            console.error('   ❌ Homepage scraping failed:', error.message);
            this.scrapedData.homepage = { error: error.message };
            return null;
        }
    }

    /**
     * Extract individual component page
     */
    async scrapeComponentPage(page, url) {
        console.log(`   🧩 Scraping component: ${url}`);
        
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const component = {
                url: url,
                title: await page.title(),
                timestamp: new Date().toISOString()
            };
            
            // Extract main title
            const title = await this.safeQuerySelector(page, ['h1', '.title', '.component-title']);
            if (title && title.data.length > 0) {
                component.name = title.data[0];
            }
            
            // Extract description
            const description = await this.safeQuerySelector(page, this.selectors.descriptions);
            if (description && description.data.length > 0) {
                component.description = description.data[0];
            }
            
            // Extract code blocks
            const codeBlocks = await page.evaluate(() => {
                const codeElements = document.querySelectorAll('pre code, .code-block, pre, [data-language]');
                return Array.from(codeElements).map(el => ({
                    language: el.getAttribute('data-language') || el.className.match(/language-(\w+)/)?.[1] || 'javascript',
                    code: el.textContent?.trim()
                })).filter(block => block.code && block.code.length > 10);
            });
            
            if (codeBlocks.length > 0) {
                component.codeExamples = codeBlocks;
            }
            
            // Extract props information (if available)
            const propsData = await page.evaluate(() => {
                // Look for props tables or lists
                const propsTables = document.querySelectorAll('table');
                const propsLists = document.querySelectorAll('ul, ol');
                
                const extractTableData = (table) => {
                    const rows = Array.from(table.querySelectorAll('tr'));
                    if (rows.length < 2) return null;
                    
                    const headers = Array.from(rows[0].querySelectorAll('th, td')).map(th => th.textContent?.trim());
                    const data = rows.slice(1).map(row => {
                        const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim());
                        return headers.reduce((obj, header, index) => {
                            obj[header] = cells[index];
                            return obj;
                        }, {});
                    });
                    
                    return data;
                };
                
                // Check if any table looks like props documentation
                for (const table of propsTables) {
                    const tableText = table.textContent?.toLowerCase();
                    if (tableText?.includes('prop') || tableText?.includes('type') || tableText?.includes('required')) {
                        const propsData = extractTableData(table);
                        if (propsData && propsData.length > 0) {
                            return propsData;
                        }
                    }
                }
                
                return null;
            });
            
            if (propsData) {
                component.props = propsData;
            }
            
            // Extract images/demos
            const images = await this.safeQuerySelector(page, ['img'], 'src');
            if (images && images.data.length > 0) {
                component.images = images.data.filter(src => 
                    src.includes('.png') || src.includes('.jpg') || src.includes('.gif') || src.includes('.webp')
                );
            }
            
            return component;
            
        } catch (error) {
            console.error(`   ❌ Component scraping failed for ${url}:`, error.message);
            return {
                url: url,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Main scraping orchestration
     */
    async scrape(options = {}) {
        const { maxComponents = 10, includeHomepage = true } = options;
        
        let browser;
        
        try {
            console.log('🎬 Starting ReactBits.dev scraping...');
            console.log('=' .repeat(60));
            
            const startTime = Date.now();
            
            // Setup browser
            const { browser: browserInstance, page } = await this.setupBrowser();
            browser = browserInstance;
            
            // Scrape homepage
            if (includeHomepage) {
                const homepage = await this.scrapeHomepage(page);
                
                if (homepage && homepage.componentLinks) {
                    console.log(`🔍 Discovered ${homepage.componentLinks.length} component links`);
                    
                    // Scrape individual components
                    const componentLinksToScrape = homepage.componentLinks.slice(0, maxComponents);
                    
                    console.log(`🧩 Scraping ${componentLinksToScrape.length} component pages...`);
                    
                    for (let i = 0; i < componentLinksToScrape.length; i++) {
                        const link = componentLinksToScrape[i];
                        
                        console.log(`   [${i + 1}/${componentLinksToScrape.length}] Processing: ${link}`);
                        
                        const component = await this.scrapeComponentPage(page, link);
                        if (component) {
                            this.scrapedData.components.push(component);
                        }
                        
                        // Rate limiting delay
                        if (i < componentLinksToScrape.length - 1) {
                            console.log(`   ⏳ Waiting ${this.pageDelay / 1000}s before next page...`);
                            await new Promise(resolve => setTimeout(resolve, this.pageDelay));
                        }
                    }
                }
            }
            
            // Add metadata
            this.scrapedData.metadata = {
                scrapedAt: new Date().toISOString(),
                totalComponents: this.scrapedData.components.length,
                duration: (Date.now() - startTime) / 1000,
                scraper: 'ReactBits Scraper v1.0'
            };
            
            // Save results
            const filename = `reactbits-data-${Date.now()}.json`;
            const filepath = path.join(__dirname, filename);
            await fs.writeFile(filepath, JSON.stringify(this.scrapedData, null, 2));
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log('=' .repeat(60));
            console.log(`✅ Scraping completed in ${duration.toFixed(2)} seconds`);
            console.log(`📊 Results:`);
            console.log(`   • Homepage data: ${this.scrapedData.homepage.title ? 'Success' : 'Failed'}`);
            console.log(`   • Components scraped: ${this.scrapedData.components.length}`);
            console.log(`   • Data saved to: ${filepath}`);
            
            // Show sample data
            if (this.scrapedData.components.length > 0) {
                const sampleComponent = this.scrapedData.components[0];
                console.log(`\n📋 Sample Component Data:`);
                console.log(`   • Name: ${sampleComponent.name || 'Unknown'}`);
                console.log(`   • Description: ${sampleComponent.description?.substring(0, 100) || 'No description'}...`);
                console.log(`   • Code examples: ${sampleComponent.codeExamples?.length || 0}`);
                console.log(`   • Props documented: ${sampleComponent.props?.length || 0}`);
            }
            
            return this.scrapedData;
            
        } catch (error) {
            console.error('❌ Scraping failed:', error.message);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Load analysis results to update selectors
     */
    async loadAnalysisResults(analysisFilePath) {
        try {
            const analysisData = JSON.parse(await fs.readFile(analysisFilePath, 'utf8'));
            
            if (analysisData.scrapingStrategy && analysisData.scrapingStrategy.selectors) {
                // Update selectors based on analysis
                const strategy = analysisData.scrapingStrategy;
                
                if (strategy.selectors.navigation) {
                    this.selectors.navigation = strategy.selectors.navigation.map(nav => nav.selector).flat();
                }
                
                if (strategy.selectors.components) {
                    this.selectors.components = strategy.selectors.components.map(comp => comp.selector).flat();
                }
                
                console.log('✅ Selectors updated from analysis results');
            }
            
            // Update rate limiting based on recommendations
            if (analysisData.recommendations) {
                const rateLimitRec = analysisData.recommendations.find(rec => 
                    rec.category === 'Rate Limiting'
                );
                
                if (rateLimitRec && rateLimitRec.recommendation.includes('1-2 second')) {
                    this.requestDelay = 1500;
                    this.pageDelay = 3000;
                    console.log('✅ Rate limiting updated from analysis');
                }
            }
            
        } catch (error) {
            console.log('⚠️ Could not load analysis results, using default selectors');
        }
    }
}

// CLI execution
if (require.main === module) {
    const scraper = new ReactBitsScraper();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const maxComponents = parseInt(args.find(arg => arg.startsWith('--max='))?.split('=')[1]) || 5;
    const analysisFile = args.find(arg => arg.startsWith('--analysis='))?.split('=')[1];
    
    console.log(`🎯 Configuration:`);
    console.log(`   • Max components: ${maxComponents}`);
    if (analysisFile) {
        console.log(`   • Analysis file: ${analysisFile}`);
    }
    
    const runScraper = async () => {
        try {
            // Load analysis results if provided
            if (analysisFile) {
                await scraper.loadAnalysisResults(analysisFile);
            }
            
            // Run scraper
            await scraper.scrape({ maxComponents });
            
            console.log('\n🎉 Scraping complete! Check the generated JSON file for results.');
            
        } catch (error) {
            console.error('💥 Scraping failed:', error.message);
            process.exit(1);
        }
    };
    
    runScraper();
}

module.exports = ReactBitsScraper;