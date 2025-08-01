#!/usr/bin/env node

/**
 * ReactBits.dev Deep Technical Analysis Script
 * Comprehensive Puppeteer-based analyzer with anti-detection measures
 * 
 * Features:
 * - Advanced anti-detection (headers, viewport, user agents)
 * - Network request interception and analysis
 * - Technical stack detection
 * - Security analysis
 * - DOM structure examination
 * - Performance metrics
 * - Comprehensive reporting
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ReactBitsAnalyzer {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
        
        this.viewports = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1440, height: 900 },
            { width: 1536, height: 864 }
        ];
        
        this.analysisResults = {
            timestamp: new Date().toISOString(),
            url: 'https://reactbits.dev',
            networkRequests: [],
            technicalStack: {},
            securityHeaders: {},
            domStructure: {},
            performance: {},
            scrapingStrategy: {},
            errors: []
        };
    }

    /**
     * Generate realistic browser fingerprint
     */
    generateFingerprint() {
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        const viewport = this.viewports[Math.floor(Math.random() * this.viewports.length)];
        
        return {
            userAgent,
            viewport,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'DNT': '1',
                'Pragma': 'no-cache',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        };
    }

    /**
     * Setup browser with anti-detection measures
     */
    async setupBrowser() {
        const fingerprint = this.generateFingerprint();
        
        console.log('🚀 Launching browser with anti-detection measures...');
        console.log(`📱 User Agent: ${fingerprint.userAgent.substring(0, 50)}...`);
        console.log(`🖥️  Viewport: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`);
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-field-trial-config',
                '--disable-back-forward-cache',
                '--disable-ipc-flooding-protection'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport and user agent
        await page.setViewport(fingerprint.viewport);
        await page.setUserAgent(fingerprint.userAgent);
        
        // Set additional headers
        await page.setExtraHTTPHeaders(fingerprint.headers);
        
        // Override permissions
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://reactbits.dev', [
            'geolocation',
            'notifications'
        ]);

        // Stealth measures
        await page.evaluateOnNewDocument(() => {
            // Override webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            // Override plugins length
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
            
            // Mock chrome runtime
            window.chrome = {
                runtime: {}
            };
            
            // Remove automation indicators
            delete window.webdriver;
            delete window.callPhantom;
            delete window._phantom;
            delete window.Buffer;
        });

        return { browser, page };
    }

    /**
     * Intercept and analyze network requests
     */
    async interceptNetworkRequests(page) {
        console.log('🌐 Setting up network request interception...');
        
        const requests = [];
        const responses = [];
        
        await page.setRequestInterception(true);
        
        page.on('request', (request) => {
            const requestData = {
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                resourceType: request.resourceType(),
                timestamp: Date.now()
            };
            requests.push(requestData);
            
            // Continue the request
            request.continue();
        });
        
        page.on('response', (response) => {
            const responseData = {
                url: response.url(),
                status: response.status(),
                headers: response.headers(),
                resourceType: response.request().resourceType(),
                timestamp: Date.now()
            };
            responses.push(responseData);
        });
        
        this.analysisResults.networkRequests = { requests, responses };
        
        return { requests, responses };
    }

    /**
     * Analyze technical stack from network requests and DOM
     */
    async analyzeTechnicalStack(page, networkData) {
        console.log('🔍 Analyzing technical stack...');
        
        const stack = {
            frameworks: [],
            bundlers: [],
            libraries: [],
            deployment: {},
            buildInfo: {}
        };
        
        try {
            // Analyze from network requests
            const jsFiles = networkData.requests.filter(req => 
                req.resourceType === 'script' && req.url.includes('.js')
            );
            
            // Check for React/Next.js patterns
            const reactPatterns = jsFiles.filter(req => 
                req.url.includes('react') || 
                req.url.includes('next') ||
                req.url.includes('_next')
            );
            
            if (reactPatterns.length > 0) {
                stack.frameworks.push('React');
                if (reactPatterns.some(req => req.url.includes('next'))) {
                    stack.frameworks.push('Next.js');
                }
            }
            
            // Analyze bundle patterns
            const bundlePatterns = jsFiles.filter(req => 
                req.url.includes('webpack') || 
                req.url.includes('chunk') ||
                req.url.includes('.bundle.') ||
                req.url.includes('_app-') ||
                req.url.includes('_document-')
            );
            
            if (bundlePatterns.length > 0) {
                stack.bundlers.push('Webpack');
            }
            
            // Check for Vercel deployment
            const vercelHeaders = networkData.responses.find(res => 
                res.headers['x-vercel-id'] || 
                res.headers['server']?.includes('Vercel')
            );
            
            if (vercelHeaders) {
                stack.deployment.platform = 'Vercel';
                stack.deployment.region = vercelHeaders.headers['x-vercel-region'] || 'unknown';
            }
            
            // Analyze from DOM
            const domAnalysis = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                const links = Array.from(document.querySelectorAll('link[href]'));
                const metas = Array.from(document.querySelectorAll('meta'));
                
                return {
                    scripts: scripts.map(s => s.src),
                    stylesheets: links.filter(l => l.rel === 'stylesheet').map(l => l.href),
                    metas: metas.map(m => ({ name: m.name, content: m.content, property: m.property })),
                    nextData: window.__NEXT_DATA__ || null,
                    reactVersion: window.React?.version || null
                };
            });
            
            // Check for Next.js from DOM
            if (domAnalysis.nextData) {
                stack.frameworks.push('Next.js');
                stack.buildInfo.nextData = {
                    buildId: domAnalysis.nextData.buildId,
                    runtimeConfig: domAnalysis.nextData.runtimeConfig
                };
            }
            
            // Check meta tags for framework hints
            const generatorMeta = domAnalysis.metas.find(m => m.name === 'generator');
            if (generatorMeta) {
                stack.buildInfo.generator = generatorMeta.content;
            }
            
            this.analysisResults.technicalStack = stack;
            
        } catch (error) {
            console.error('❌ Error analyzing technical stack:', error.message);
            this.analysisResults.errors.push({
                type: 'technical_stack_analysis',
                error: error.message
            });
        }
        
        return stack;
    }

    /**
     * Analyze security headers and anti-bot measures
     */
    async analyzeSecurityMeasures(networkData) {
        console.log('🔒 Analyzing security measures...');
        
        const security = {
            headers: {},
            antiBotMeasures: [],
            rateLimiting: {},
            jsProtection: []
        };
        
        try {
            // Analyze main page response headers
            const mainResponse = networkData.responses.find(res => 
                res.url === 'https://reactbits.dev/' || res.url === 'https://reactbits.dev'
            );
            
            if (mainResponse) {
                // Security headers
                const securityHeaders = [
                    'strict-transport-security',
                    'content-security-policy',
                    'x-frame-options',
                    'x-content-type-options',
                    'referrer-policy',
                    'permissions-policy',
                    'x-xss-protection'
                ];
                
                securityHeaders.forEach(header => {
                    if (mainResponse.headers[header]) {
                        security.headers[header] = mainResponse.headers[header];
                    }
                });
                
                // Rate limiting headers
                const rateLimitHeaders = [
                    'x-ratelimit-limit',
                    'x-ratelimit-remaining',
                    'retry-after',
                    'x-rate-limit-limit'
                ];
                
                rateLimitHeaders.forEach(header => {
                    if (mainResponse.headers[header]) {
                        security.rateLimiting[header] = mainResponse.headers[header];
                    }
                });
                
                // Server information
                if (mainResponse.headers.server) {
                    security.serverInfo = mainResponse.headers.server;
                }
            }
            
            // Check for Cloudflare
            const cloudflareResponse = networkData.responses.find(res => 
                res.headers['cf-ray'] || 
                res.headers['server']?.includes('cloudflare')
            );
            
            if (cloudflareResponse) {
                security.antiBotMeasures.push('Cloudflare');
                security.cloudflare = {
                    ray: cloudflareResponse.headers['cf-ray'],
                    country: cloudflareResponse.headers['cf-ipcountry']
                };
            }
            
            this.analysisResults.securityHeaders = security;
            
        } catch (error) {
            console.error('❌ Error analyzing security measures:', error.message);
            this.analysisResults.errors.push({
                type: 'security_analysis',
                error: error.message
            });
        }
        
        return security;
    }

    /**
     * Examine DOM structure and extract selectors
     */
    async analyzeDOMStructure(page) {
        console.log('🏗️  Analyzing DOM structure...');
        
        try {
            const domStructure = await page.evaluate(() => {
                // Helper function to get element info
                const getElementInfo = (element) => {
                    return {
                        tagName: element.tagName.toLowerCase(),
                        className: element.className,
                        id: element.id,
                        textContent: element.textContent?.substring(0, 100),
                        attributes: Array.from(element.attributes).reduce((acc, attr) => {
                            acc[attr.name] = attr.value;
                            return acc;
                        }, {})
                    };
                };
                
                // Navigation structure
                const nav = document.querySelector('nav');
                const navLinks = Array.from(document.querySelectorAll('nav a, header a, [role="navigation"] a'));
                
                // Component categories (common patterns)
                const componentSections = Array.from(document.querySelectorAll(
                    '[data-testid], [data-cy], .component, .card, .grid > div, main > div, section'
                ));
                
                // Headers and structure
                const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                
                // Links and URLs
                const allLinks = Array.from(document.querySelectorAll('a[href]'));
                
                // Images
                const images = Array.from(document.querySelectorAll('img'));
                
                // Forms and inputs
                const forms = Array.from(document.querySelectorAll('form'));
                const inputs = Array.from(document.querySelectorAll('input, textarea, select, button'));
                
                return {
                    navigation: {
                        element: nav ? getElementInfo(nav) : null,
                        links: navLinks.map(link => ({
                            href: link.href,
                            text: link.textContent?.trim(),
                            ...getElementInfo(link)
                        }))
                    },
                    componentSections: componentSections.map(getElementInfo),
                    headers: headers.map(h => ({
                        level: h.tagName.toLowerCase(),
                        text: h.textContent?.trim(),
                        ...getElementInfo(h)
                    })),
                    links: allLinks.map(link => ({
                        href: link.href,
                        text: link.textContent?.trim(),
                        ...getElementInfo(link)
                    })),
                    images: images.map(img => ({
                        src: img.src,
                        alt: img.alt,
                        ...getElementInfo(img)
                    })),
                    forms: forms.map(getElementInfo),
                    inputs: inputs.map(getElementInfo),
                    structure: {
                        title: document.title,
                        bodyClasses: document.body.className,
                        mainContent: document.querySelector('main') ? getElementInfo(document.querySelector('main')) : null,
                        footer: document.querySelector('footer') ? getElementInfo(document.querySelector('footer')) : null
                    }
                };
            });
            
            this.analysisResults.domStructure = domStructure;
            return domStructure;
            
        } catch (error) {
            console.error('❌ Error analyzing DOM structure:', error.message);
            this.analysisResults.errors.push({
                type: 'dom_analysis',
                error: error.message
            });
            return null;
        }
    }

    /**
     * Test JavaScript requirements and content loading
     */
    async testJavaScriptRequirements(page) {
        console.log('⚡ Testing JavaScript requirements...');
        
        try {
            // Test with JavaScript disabled
            await page.setJavaScriptEnabled(false);
            await page.reload({ waitUntil: 'networkidle0' });
            
            const noJsContent = await page.evaluate(() => {
                return {
                    title: document.title,
                    bodyText: document.body.textContent?.length || 0,
                    hasContent: document.querySelector('main')?.textContent?.length > 100,
                    componentCount: document.querySelectorAll('[data-testid], .component, .card').length
                };
            });
            
            // Re-enable JavaScript
            await page.setJavaScriptEnabled(true);
            await page.reload({ waitUntil: 'networkidle0' });
            
            const withJsContent = await page.evaluate(() => {
                return {
                    title: document.title,
                    bodyText: document.body.textContent?.length || 0,
                    hasContent: document.querySelector('main')?.textContent?.length > 100,
                    componentCount: document.querySelectorAll('[data-testid], .component, .card').length
                };
            });
            
            const jsRequirements = {
                requiresJs: withJsContent.componentCount > noJsContent.componentCount * 2,
                contentDifference: {
                    noJs: noJsContent,
                    withJs: withJsContent
                },
                renderingPattern: withJsContent.componentCount > noJsContent.componentCount ? 'CSR' : 'SSR'
            };
            
            this.analysisResults.jsRequirements = jsRequirements;
            return jsRequirements;
            
        } catch (error) {
            console.error('❌ Error testing JavaScript requirements:', error.message);
            this.analysisResults.errors.push({
                type: 'js_requirements_test',
                error: error.message
            });
            return null;
        }
    }

    /**
     * Measure performance metrics
     */
    async measurePerformance(page) {
        console.log('📊 Measuring performance metrics...');
        
        try {
            const metrics = await page.metrics();
            
            const performanceMetrics = await page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                
                return {
                    navigation: navigation ? {
                        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                        firstByte: navigation.responseStart - navigation.requestStart,
                        domInteractive: navigation.domInteractive - navigation.navigationStart
                    } : null,
                    paint: paint.reduce((acc, entry) => {
                        acc[entry.name] = entry.startTime;
                        return acc;
                    }, {}),
                    resourceCount: performance.getEntriesByType('resource').length,
                    totalLoadTime: Date.now() - performance.timeOrigin
                };
            });
            
            const combinedMetrics = {
                puppeteer: metrics,
                browser: performanceMetrics
            };
            
            this.analysisResults.performance = combinedMetrics;
            return combinedMetrics;
            
        } catch (error) {
            console.error('❌ Error measuring performance:', error.message);
            this.analysisResults.errors.push({
                type: 'performance_measurement',
                error: error.message
            });
            return null;
        }
    }

    /**
     * Generate scraping strategy recommendations
     */
    generateScrapingStrategy() {
        console.log('🎯 Generating scraping strategy...');
        
        const strategy = {
            recommendedApproach: '',
            selectors: {},
            antiDetection: [],
            rateLimiting: {},
            errorHandling: [],
            dataExtraction: {}
        };
        
        const { technicalStack, domStructure, jsRequirements, securityHeaders } = this.analysisResults;
        
        // Determine approach based on JS requirements
        if (jsRequirements?.requiresJs) {
            strategy.recommendedApproach = 'puppeteer_headless';
            strategy.antiDetection.push('Use realistic user agents and headers');
            strategy.antiDetection.push('Implement random delays between requests');
            strategy.antiDetection.push('Rotate IP addresses if scraping at scale');
        } else {
            strategy.recommendedApproach = 'cheerio_static';
        }
        
        // Security considerations
        if (securityHeaders.antiBotMeasures?.includes('Cloudflare')) {
            strategy.antiDetection.push('Implement Cloudflare bypass techniques');
            strategy.antiDetection.push('Use residential proxies');
            strategy.rateLimiting.recommended = '1-2 requests per second';
        }
        
        // Selector strategy
        if (domStructure?.navigation?.links) {
            strategy.selectors.navigation = domStructure.navigation.links.map(link => ({
                text: link.text,
                href: link.href,
                selector: this.generateSelector(link)
            }));
        }
        
        if (domStructure?.componentSections) {
            strategy.selectors.components = domStructure.componentSections.slice(0, 5).map(comp => ({
                tagName: comp.tagName,
                className: comp.className,
                selector: this.generateSelector(comp)
            }));
        }
        
        // Data extraction patterns
        const links = domStructure?.links || [];
        const componentLinks = links.filter(link => 
            link.href.includes('/component') || 
            link.href.includes('/docs') ||
            link.text?.toLowerCase().includes('component')
        );
        
        strategy.dataExtraction = {
            componentUrls: componentLinks.map(link => link.href),
            urlPatterns: this.extractUrlPatterns(links),
            contentSelectors: this.generateContentSelectors(domStructure)
        };
        
        this.analysisResults.scrapingStrategy = strategy;
        return strategy;
    }

    /**
     * Generate CSS selector for element
     */
    generateSelector(element) {
        const selectors = [];
        
        if (element.id) {
            selectors.push(`#${element.id}`);
        }
        
        if (element.className && element.className.trim()) {
            const classes = element.className.trim().split(/\s+/).slice(0, 3);
            selectors.push(`.${classes.join('.')}`);
        }
        
        if (element.attributes && element.attributes['data-testid']) {
            selectors.push(`[data-testid="${element.attributes['data-testid']}"]`);
        }
        
        selectors.push(element.tagName);
        
        return selectors;
    }

    /**
     * Extract URL patterns from links
     */
    extractUrlPatterns(links) {
        const patterns = new Set();
        
        links.forEach(link => {
            if (link.href) {
                const url = new URL(link.href);
                const pathSegments = url.pathname.split('/').filter(Boolean);
                
                if (pathSegments.length > 0) {
                    patterns.add(`/${pathSegments[0]}/*`);
                }
                
                if (pathSegments.length > 1) {
                    patterns.add(`/${pathSegments[0]}/${pathSegments[1]}/*`);
                }
            }
        });
        
        return Array.from(patterns);
    }

    /**
     * Generate content selectors based on DOM structure
     */
    generateContentSelectors(domStructure) {
        const selectors = {};
        
        if (domStructure?.headers) {
            selectors.titles = domStructure.headers
                .filter(h => h.level === 'h1' || h.level === 'h2')
                .map(h => h.className ? `.${h.className.split(' ')[0]}` : h.level)
                .slice(0, 3);
        }
        
        if (domStructure?.componentSections) {
            selectors.components = domStructure.componentSections
                .filter(comp => comp.className)
                .map(comp => `.${comp.className.split(' ')[0]}`)
                .slice(0, 5);
        }
        
        selectors.links = ['a[href]', 'nav a', '.nav-link', '[role="link"]'];
        selectors.content = ['main', '.content', '.container', 'article', 'section'];
        
        return selectors;
    }

    /**
     * Generate comprehensive report
     */
    async generateReport() {
        console.log('📋 Generating comprehensive report...');
        
        const report = {
            ...this.analysisResults,
            summary: {
                totalRequests: this.analysisResults.networkRequests?.requests?.length || 0,
                jsFrameworks: this.analysisResults.technicalStack?.frameworks || [],
                requiresJavaScript: this.analysisResults.jsRequirements?.requiresJs || false,
                hasAntiBot: this.analysisResults.securityHeaders?.antiBotMeasures?.length > 0,
                scrapingComplexity: this.calculateComplexity(),
                recommendedTools: this.getRecommendedTools()
            },
            recommendations: this.generateRecommendations()
        };
        
        // Save report to file
        const reportPath = path.join(__dirname, `reactbits-analysis-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`📄 Report saved to: ${reportPath}`);
        
        return report;
    }

    /**
     * Calculate scraping complexity score
     */
    calculateComplexity() {
        let complexity = 'LOW';
        let score = 0;
        
        if (this.analysisResults.jsRequirements?.requiresJs) score += 3;
        if (this.analysisResults.securityHeaders?.antiBotMeasures?.length > 0) score += 2;
        if (this.analysisResults.technicalStack?.frameworks?.includes('React')) score += 2;
        if (this.analysisResults.networkRequests?.requests?.length > 50) score += 1;
        
        if (score >= 6) complexity = 'HIGH';
        else if (score >= 3) complexity = 'MEDIUM';
        
        return { level: complexity, score };
    }

    /**
     * Get recommended tools based on analysis
     */
    getRecommendedTools() {
        const tools = [];
        
        if (this.analysisResults.jsRequirements?.requiresJs) {
            tools.push('Puppeteer', 'Playwright');
        } else {
            tools.push('Cheerio', 'JSDOM');
        }
        
        if (this.analysisResults.securityHeaders?.antiBotMeasures?.includes('Cloudflare')) {
            tools.push('undetected-chromedriver', 'cloudscraper');
        }
        
        return tools;
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        const { technicalStack, jsRequirements, securityHeaders, scrapingStrategy } = this.analysisResults;
        
        // JavaScript handling
        if (jsRequirements?.requiresJs) {
            recommendations.push({
                category: 'JavaScript Handling',
                priority: 'HIGH',
                recommendation: 'Use Puppeteer or Playwright for full JavaScript rendering',
                reason: 'Site requires JavaScript for content loading'
            });
        }
        
        // Anti-detection
        if (securityHeaders?.antiBotMeasures?.length > 0) {
            recommendations.push({
                category: 'Anti-Detection',
                priority: 'HIGH',
                recommendation: 'Implement advanced anti-detection measures including proxy rotation and realistic headers',
                reason: `Site uses ${securityHeaders.antiBotMeasures.join(', ')} for bot protection`
            });
        }
        
        // Rate limiting
        recommendations.push({
            category: 'Rate Limiting',
            priority: 'MEDIUM',
            recommendation: 'Implement 1-2 second delays between requests',
            reason: 'Prevent triggering rate limiting mechanisms'
        });
        
        // Error handling
        recommendations.push({
            category: 'Error Handling',
            priority: 'MEDIUM',
            recommendation: 'Implement retry logic with exponential backoff',
            reason: 'Handle temporary failures and network issues'
        });
        
        // Selectors
        if (scrapingStrategy?.selectors) {
            recommendations.push({
                category: 'Selector Strategy',
                priority: 'MEDIUM',
                recommendation: 'Use multiple fallback selectors for robustness',
                reason: 'Site structure may change, requiring fallback options'
            });
        }
        
        return recommendations;
    }

    /**
     * Main analysis method
     */
    async analyze() {
        let browser;
        
        try {
            console.log('🎬 Starting ReactBits.dev deep technical analysis...');
            console.log('=' .repeat(60));
            
            const startTime = Date.now();
            
            // Setup browser
            const { browser: browserInstance, page } = await this.setupBrowser();
            browser = browserInstance;
            
            // Setup network interception
            const networkData = await this.interceptNetworkRequests(page);
            
            // Navigate to the site
            console.log('🌐 Navigating to ReactBits.dev...');
            await page.goto('https://reactbits.dev', { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // Wait for dynamic content
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Perform analysis
            await this.analyzeTechnicalStack(page, networkData);
            await this.analyzeSecurityMeasures(networkData);
            await this.analyzeDOMStructure(page);
            await this.testJavaScriptRequirements(page);
            await this.measurePerformance(page);
            this.generateScrapingStrategy();
            
            // Generate final report
            const report = await this.generateReport();
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log('=' .repeat(60));
            console.log(`✅ Analysis completed in ${duration.toFixed(2)} seconds`);
            console.log('📊 Summary:');
            console.log(`   • Total network requests: ${report.summary.totalRequests}`);
            console.log(`   • JavaScript frameworks: ${report.summary.jsFrameworks.join(', ') || 'None detected'}`);
            console.log(`   • Requires JavaScript: ${report.summary.requiresJavaScript ? 'Yes' : 'No'}`);
            console.log(`   • Anti-bot measures: ${report.summary.hasAntiBot ? 'Detected' : 'None detected'}`);
            console.log(`   • Scraping complexity: ${report.summary.scrapingComplexity.level}`);
            console.log(`   • Recommended tools: ${report.summary.recommendedTools.join(', ')}`);
            
            return report;
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            this.analysisResults.errors.push({
                type: 'general_error',
                error: error.message,
                stack: error.stack
            });
            
            // Still try to generate a partial report
            return await this.generateReport();
            
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}

// CLI execution
if (require.main === module) {
    const analyzer = new ReactBitsAnalyzer();
    
    analyzer.analyze()
        .then(report => {
            console.log('\n🎉 Analysis complete! Check the generated JSON report for detailed findings.');
            
            if (report.recommendations?.length > 0) {
                console.log('\n🎯 Top Recommendations:');
                report.recommendations.slice(0, 3).forEach((rec, index) => {
                    console.log(`   ${index + 1}. [${rec.priority}] ${rec.recommendation}`);
                });
            }
        })
        .catch(error => {
            console.error('💥 Fatal error:', error.message);
            process.exit(1);
        });
}

module.exports = ReactBitsAnalyzer;