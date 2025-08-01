const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');

// Add stealth plugin for anti-detection
puppeteer.use(StealthPlugin());

class ComprehensiveReactBitsScraper {
  constructor() {
    // Correct repository URL
    this.baseUrl = 'https://github.com/pheralb/react-bits';
    this.rawUrl = 'https://raw.githubusercontent.com/pheralb/react-bits/main';
    this.apiUrl = 'https://api.github.com/repos/pheralb/react-bits';
    this.browser = null;
    this.page = null;
    this.cache = new Map();
    this.cacheDir = './scraper-cache';
    this.results = {
      repositoryOverview: {},
      directoryStructure: {},
      variantArchitecture: {},
      components: {},
      extractedCode: {},
      analysis: {},
      implementationPatterns: {}
    };
    
    // Rate limiting and retry configuration for production use
    this.requestDelay = 2000; // 2 seconds between requests
    this.maxRetries = 3;
    this.cacheTimeout = 3600000; // 1 hour cache timeout
    
    // Anti-detection user agents
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebLib/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    // Component variant patterns to identify
    this.variantPatterns = {
      'js-css': /\.jsx?$/,
      'js-tailwind': /\.jsx?$/,
      'ts-css': /\.tsx?$/,
      'ts-tailwind': /\.tsx?$/
    };
    
    // Priority directories for component extraction
    this.componentDirectories = [
      'src/components',
      'components',
      'src/ui',
      'ui',
      'src/lib',
      'lib'
    ];
  }

  async initialize() {
    console.log('🚀 Initializing Comprehensive React Bits Scraper...');
    console.log(`📍 Target Repository: ${this.baseUrl}`);
    
    // Ensure cache directory exists
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      console.log('📁 Cache directory ready');
    } catch (error) {
      console.log('⚠️ Cache directory issue:', error.message);
    }

    // Launch browser with stealth configuration
    this.browser = await puppeteer.launch({
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
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Configure page for anti-detection
    await this.configureAntiDetection();
    
    console.log('✅ Scraper initialized successfully');
  }

  async configureAntiDetection() {
    // Set random user agent
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await this.page.setUserAgent(userAgent);
    
    // Set realistic viewport
    await this.page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Set headers to mimic real browser
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Charset': 'utf-8, iso-8859-1;q=0.5',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1'
    });

    console.log('🛡️ Anti-detection measures configured');
  }

  async delay(ms = this.requestDelay) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryWithExponentialBackoff(requestFunction, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await requestFunction();
      } catch (error) {
        console.log(`⚠️ Request failed (attempt ${i + 1}/${retries}):`, error.message);
        if (i === retries - 1) throw error;
        
        // Exponential backoff with jitter
        const baseDelay = this.requestDelay * Math.pow(2, i);
        const jitter = Math.random() * 1000;
        await this.delay(baseDelay + jitter);
      }
    }
  }

  async fetchWithGitHubAPI(endpoint) {
    console.log(`🔌 GitHub API: ${endpoint}`);
    
    const cacheKey = `api_${endpoint}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('💾 Using cached API response');
        return cached.data;
      }
    }

    return await this.retryWithExponentialBackoff(async () => {
      const response = await this.page.goto(`${this.apiUrl}${endpoint}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      if (!response.ok()) {
        throw new Error(`GitHub API error: ${response.status()}`);
      }

      const content = await this.page.content();
      const jsonMatch = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
      
      throw new Error('Could not parse API response');
    });
  }

  async fetchRawFile(filePath) {
    console.log(`📄 Fetching: ${filePath}`);
    
    const cacheKey = `file_${filePath}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('💾 Using cached file');
        return cached.data;
      }
    }

    const url = `${this.rawUrl}/${filePath}`;
    
    return await this.retryWithExponentialBackoff(async () => {
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 20000
      });
      
      if (response.status() === 404) {
        return null;
      }
      
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}`);
      }
      
      const content = await this.page.content();
      const preMatch = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
      
      let fileContent = preMatch ? preMatch[1] : content;
      
      // Decode HTML entities
      fileContent = fileContent
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');
      
      this.cache.set(cacheKey, { data: fileContent, timestamp: Date.now() });
      await this.delay(500); // Short delay for raw file requests
      
      return fileContent;
    });
  }

  async analyzeRepositoryStructure() {
    console.log('📊 Analyzing repository structure via GitHub API...');
    
    try {
      // Get repository information
      const repoInfo = await this.fetchWithGitHubAPI('');
      
      // Get repository tree
      const treeData = await this.fetchWithGitHubAPI('/git/trees/main?recursive=1');
      
      this.results.repositoryOverview = {
        name: repoInfo.name,
        fullName: repoInfo.full_name,
        description: repoInfo.description,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        watchers: repoInfo.watchers_count,
        language: repoInfo.language,
        topics: repoInfo.topics || [],
        license: repoInfo.license?.name || 'Not specified',
        createdAt: repoInfo.created_at,
        updatedAt: repoInfo.updated_at,
        size: repoInfo.size,
        defaultBranch: repoInfo.default_branch
      };

      // Organize tree structure
      this.results.directoryStructure = this.organizeTreeStructure(treeData.tree);
      
      console.log('✅ Repository structure analyzed');
      console.log(`📁 Found ${treeData.tree.length} total files and directories`);
      
    } catch (error) {
      console.error('❌ Failed to analyze repository structure:', error.message);
      // Fallback to web scraping
      await this.fallbackWebScraping();
    }
  }

  organizeTreeStructure(tree) {
    const structure = {
      files: [],
      directories: {},
      componentFiles: [],
      configFiles: [],
      stats: {
        totalFiles: 0,
        jsFiles: 0,
        tsFiles: 0,
        jsonFiles: 0,
        mdFiles: 0
      }
    };

    tree.forEach(item => {
      const pathParts = item.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const fileExt = path.extname(fileName).toLowerCase();

      structure.stats.totalFiles++;

      // Categorize by file type
      if (['.js', '.jsx'].includes(fileExt)) {
        structure.stats.jsFiles++;
      } else if (['.ts', '.tsx'].includes(fileExt)) {
        structure.stats.tsFiles++;
      } else if (fileExt === '.json') {
        structure.stats.jsonFiles++;
      } else if (fileExt === '.md') {
        structure.stats.mdFiles++;
      }

      // Identify component files
      if (['.jsx', '.tsx', '.js', '.ts'].includes(fileExt) && 
          (item.path.includes('component') || item.path.includes('ui'))) {
        structure.componentFiles.push({
          path: item.path,
          name: fileName,
          type: item.type,
          size: item.size,
          extension: fileExt
        });
      }

      // Identify configuration files
      if (['package.json', 'tsconfig.json', 'next.config.js', 'tailwind.config.js'].includes(fileName)) {
        structure.configFiles.push({
          path: item.path,
          name: fileName,
          type: item.type,
          size: item.size
        });
      }

      structure.files.push({
        path: item.path,
        name: fileName,
        type: item.type,
        size: item.size,
        extension: fileExt
      });
    });

    return structure;
  }

  async analyzeVariantArchitecture() {
    console.log('🔍 Analyzing 4-variant component architecture...');
    
    const variantAnalysis = {
      detectedVariants: {},
      organizationPattern: '',
      namingConvention: '',
      directoryStructure: {},
      examples: {}
    };

    // Look for variant patterns in component files
    const componentFiles = this.results.directoryStructure.componentFiles || [];
    
    // Group components by potential variants
    const variantGroups = {
      'js-css': [],
      'js-tailwind': [],
      'ts-css': [],
      'ts-tailwind': []
    };

    // Analyze component file patterns
    for (const file of componentFiles) {
      const content = await this.fetchRawFile(file.path);
      
      if (content) {
        // Detect technology stack
        const isTypeScript = file.extension === '.tsx' || file.extension === '.ts';
        const isJavaScript = file.extension === '.jsx' || file.extension === '.js';
        const usesTailwind = content.includes('className=') && 
                           (content.includes('bg-') || content.includes('text-') || 
                            content.includes('flex') || content.includes('p-') ||
                            content.includes('m-'));
        const usesCSS = content.includes('import') && 
                       (content.includes('.css') || content.includes('styled-components') ||
                        content.includes('emotion'));

        // Categorize variants
        if (isTypeScript && usesTailwind) {
          variantGroups['ts-tailwind'].push({ ...file, content });
        } else if (isTypeScript && usesCSS) {
          variantGroups['ts-css'].push({ ...file, content });
        } else if (isJavaScript && usesTailwind) {
          variantGroups['js-tailwind'].push({ ...file, content });
        } else if (isJavaScript && usesCSS) {
          variantGroups['js-css'].push({ ...file, content });
        }
      }
      
      await this.delay(300); // Small delay between file fetches
    }

    // Analyze organization patterns
    variantAnalysis.detectedVariants = Object.keys(variantGroups).reduce((acc, variant) => {
      acc[variant] = {
        count: variantGroups[variant].length,
        files: variantGroups[variant].map(f => f.path),
        examples: variantGroups[variant].slice(0, 3) // First 3 examples
      };
      return acc;
    }, {});

    this.results.variantArchitecture = variantAnalysis;
    
    console.log('✅ Variant architecture analysis complete');
    console.log('📊 Detected variants:', Object.keys(variantAnalysis.detectedVariants).map(v => 
      `${v}: ${variantAnalysis.detectedVariants[v].count} files`
    ));
  }

  async extractComponentImplementations() {
    console.log('🧩 Extracting component implementations...');
    
    const implementations = {};
    
    // Focus on key component categories
    const focusAreas = [
      'animation',
      'text',
      'ui',
      'button',
      'card',
      'input',
      'modal',
      'navigation'
    ];

    for (const area of focusAreas) {
      console.log(`🔍 Extracting ${area} components...`);
      
      const areaComponents = this.results.directoryStructure.componentFiles.filter(file => 
        file.path.toLowerCase().includes(area)
      );

      for (const component of areaComponents) {
        try {
          const content = await this.fetchRawFile(component.path);
          
          if (content) {
            // Extract key information
            const analysis = this.analyzeComponentCode(content, component);
            
            if (!implementations[area]) {
              implementations[area] = {};
            }
            
            implementations[area][component.name] = {
              path: component.path,
              content: content,
              analysis: analysis,
              size: component.size,
              extractedAt: new Date().toISOString()
            };
          }
        } catch (error) {
          console.log(`⚠️ Failed to extract ${component.path}:`, error.message);
        }
        
        await this.delay(400);
      }
    }

    this.results.extractedCode = implementations;
    console.log('✅ Component implementations extracted');
  }

  analyzeComponentCode(content, fileInfo) {
    const analysis = {
      hasTypeScript: fileInfo.extension === '.tsx' || fileInfo.extension === '.ts',
      usesTailwind: false,
      usesCSS: false,
      imports: [],
      exports: [],
      props: [],
      hooks: [],
      dependencies: []
    };

    // Detect styling approach
    analysis.usesTailwind = /className=['"][^'"]*(?:bg-|text-|flex|p-|m-|w-|h-)/g.test(content);
    analysis.usesCSS = /import.*\.css|styled-components|@emotion/g.test(content);

    // Extract imports
    const importMatches = content.match(/import.*from ['"][^'"]+['"]/g) || [];
    analysis.imports = importMatches.map(imp => imp.trim());

    // Extract exports
    const exportMatches = content.match(/export.*(?:function|const|class|interface|type)/g) || [];
    analysis.exports = exportMatches.map(exp => exp.trim());

    // Extract props (TypeScript interfaces/types)
    const propsMatches = content.match(/(?:interface|type)\s+\w+Props\s*\{[^}]*\}/gs) || [];
    analysis.props = propsMatches.map(prop => prop.trim());

    // Extract React hooks usage
    const hookMatches = content.match(/use\w+\(/g) || [];
    analysis.hooks = [...new Set(hookMatches.map(hook => hook.replace('(', '')))];

    // Estimate complexity
    analysis.complexity = {
      lines: content.split('\n').length,
      characters: content.length,
      imports: analysis.imports.length,
      hooks: analysis.hooks.length
    };

    return analysis;
  }

  async generateArchitecturalInsights() {
    console.log('🏗️ Generating architectural insights...');
    
    const insights = {
      componentPatterns: {},
      technologyStack: {},
      implementationStrategies: {},
      bestPractices: [],
      recommendations: []
    };

    // Analyze component patterns
    const allComponents = Object.values(this.results.extractedCode).flat();
    
    // Technology usage analysis
    let totalComponents = 0;
    let tailwindComponents = 0;
    let cssComponents = 0;
    let tsComponents = 0;
    let jsComponents = 0;

    Object.values(this.results.extractedCode).forEach(category => {
      Object.values(category).forEach(component => {
        totalComponents++;
        
        if (component.analysis.usesTailwind) tailwindComponents++;
        if (component.analysis.usesCSS) cssComponents++;
        if (component.analysis.hasTypeScript) tsComponents++;
        else jsComponents++;
      });
    });

    insights.technologyStack = {
      totalComponents,
      tailwindUsage: `${((tailwindComponents / totalComponents) * 100).toFixed(1)}%`,
      cssUsage: `${((cssComponents / totalComponents) * 100).toFixed(1)}%`,
      typeScriptUsage: `${((tsComponents / totalComponents) * 100).toFixed(1)}%`,
      javaScriptUsage: `${((jsComponents / totalComponents) * 100).toFixed(1)}%`
    };

    // Generate recommendations
    insights.recommendations = [
      `Repository contains ${totalComponents} components across ${Object.keys(this.results.extractedCode).length} categories`,
      `Primary styling approach: ${tailwindComponents > cssComponents ? 'Tailwind CSS' : 'Traditional CSS'}`,
      `Primary language: ${tsComponents > jsComponents ? 'TypeScript' : 'JavaScript'}`,
      `Component organization follows ${this.detectOrganizationPattern()} pattern`
    ];

    this.results.analysis = insights;
    console.log('✅ Architectural insights generated');
  }

  detectOrganizationPattern() {
    const paths = this.results.directoryStructure.componentFiles.map(f => f.path);
    
    if (paths.some(p => p.includes('components/ui'))) {
      return 'UI-focused organization';
    } else if (paths.some(p => p.includes('components/animation'))) {
      return 'Feature-based organization';
    } else {
      return 'Custom organization';
    }
  }

  async fallbackWebScraping() {
    console.log('🔄 Falling back to web scraping...');
    
    await this.retryWithExponentialBackoff(async () => {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    });

    const basicInfo = await this.page.evaluate(() => {
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        stars: document.querySelector('#repo-stars-counter-star')?.textContent?.trim() || '0',
        forks: document.querySelector('#repo-network-counter')?.textContent?.trim() || '0'
      };
    });

    this.results.repositoryOverview = { ...this.results.repositoryOverview, ...basicInfo };
  }

  async saveComprehensiveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `react-bits-comprehensive-analysis-${timestamp}.json`;
    const filepath = path.join(this.cacheDir, filename);
    
    // Add metadata
    const finalResults = {
      ...this.results,
      metadata: {
        scraper: 'ComprehensiveReactBitsScraper',
        version: '1.0.0',
        scrapedAt: new Date().toISOString(),
        targetRepository: this.baseUrl,
        totalRequests: this.cache.size,
        cacheHits: Array.from(this.cache.values()).filter(c => 
          Date.now() - c.timestamp < this.cacheTimeout
        ).length
      }
    };
    
    try {
      await fs.writeFile(filepath, JSON.stringify(finalResults, null, 2));
      console.log(`💾 Comprehensive results saved to: ${filepath}`);
      
      // Also create a summary report
      await this.generateSummaryReport(finalResults, timestamp);
      
      return filepath;
    } catch (error) {
      console.error('❌ Failed to save results:', error.message);
      throw error;
    }
  }

  async generateSummaryReport(results, timestamp) {
    const reportPath = path.join(this.cacheDir, `react-bits-summary-${timestamp}.md`);
    
    const report = `# React Bits Repository Analysis Report

## Repository Overview
- **Name**: ${results.repositoryOverview.name || 'react-bits'}
- **Stars**: ${results.repositoryOverview.stars || 'N/A'}
- **Forks**: ${results.repositoryOverview.forks || 'N/A'}
- **Language**: ${results.repositoryOverview.language || 'N/A'}
- **Description**: ${results.repositoryOverview.description || 'N/A'}

## Directory Structure Analysis
- **Total Files**: ${results.directoryStructure.stats?.totalFiles || 0}
- **Component Files**: ${results.directoryStructure.componentFiles?.length || 0}
- **Configuration Files**: ${results.directoryStructure.configFiles?.length || 0}

## Variant Architecture
${Object.entries(results.variantArchitecture.detectedVariants || {}).map(([variant, data]) => 
  `- **${variant}**: ${data.count} files`
).join('\\n')}

## Technology Stack Analysis
${results.analysis.technologyStack ? Object.entries(results.analysis.technologyStack).map(([key, value]) => 
  `- **${key}**: ${value}`
).join('\\n') : 'Analysis pending'}

## Key Findings
${results.analysis.recommendations?.map(rec => `- ${rec}`).join('\\n') || 'Analysis in progress'}

## Extraction Summary
- **Categories Extracted**: ${Object.keys(results.extractedCode || {}).length}
- **Total Components**: ${Object.values(results.extractedCode || {}).reduce((acc, cat) => acc + Object.keys(cat).length, 0)}

---
*Generated on ${new Date().toISOString()} by ComprehensiveReactBitsScraper*
`;

    try {
      await fs.writeFile(reportPath, report);
      console.log(`📋 Summary report saved to: ${reportPath}`);
    } catch (error) {
      console.log('⚠️ Could not save summary report:', error.message);
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed and resources cleaned up');
    }
  }

  async run() {
    const startTime = Date.now();
    
    try {
      console.log('🎯 Starting Comprehensive React Bits Analysis...');
      
      await this.initialize();
      
      // Phase 1: Repository Structure Analysis
      console.log('\n📊 Phase 1: Repository Structure Analysis');
      await this.analyzeRepositoryStructure();
      
      // Phase 2: Variant Architecture Analysis
      console.log('\n🔍 Phase 2: 4-Variant Architecture Analysis');
      await this.analyzeVariantArchitecture();
      
      // Phase 3: Component Implementation Extraction
      console.log('\n🧩 Phase 3: Component Implementation Extraction');
      await this.extractComponentImplementations();
      
      // Phase 4: Architectural Insights Generation
      console.log('\n🏗️ Phase 4: Architectural Insights Generation');
      await this.generateArchitecturalInsights();
      
      // Save comprehensive results
      const filepath = await this.saveComprehensiveResults();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n🎉 Comprehensive Analysis Complete!');
      console.log(`⏱️  Total duration: ${duration} seconds`);
      console.log('📊 Final Results Summary:');
      console.log(`   • Repository: ${this.results.repositoryOverview.fullName || 'pheralb/react-bits'}`);
      console.log(`   • Components extracted: ${Object.values(this.results.extractedCode).reduce((acc, cat) => acc + Object.keys(cat).length, 0)}`);
      console.log(`   • Variants detected: ${Object.keys(this.results.variantArchitecture.detectedVariants || {}).length}`);
      console.log(`   • Total files analyzed: ${this.results.directoryStructure.stats?.totalFiles || 0}`);
      console.log(`   • Cache efficiency: ${this.cache.size} cached requests`);
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Comprehensive analysis failed:', error.message);
      console.error(error.stack);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use
module.exports = ComprehensiveReactBitsScraper;

// Run if called directly
if (require.main === module) {
  (async () => {
    const scraper = new ComprehensiveReactBitsScraper();
    try {
      await scraper.run();
    } catch (error) {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    }
  })();
}