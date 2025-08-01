const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');

// Add stealth plugin for anti-detection
puppeteer.use(StealthPlugin());

class ReactBitsScraper {
  constructor() {
    this.baseUrl = 'https://github.com/DavidHDev/react-bits';
    this.rawUrl = 'https://raw.githubusercontent.com/DavidHDev/react-bits/main';
    this.browser = null;
    this.page = null;
    this.cache = new Map();
    this.cacheDir = './scraper-cache';
    this.results = {
      repositoryOverview: {},
      directoryStructure: {},
      configurationFiles: {},
      componentAnalysis: {},
      architecturalInsights: {}
    };
    
    // Rate limiting and retry configuration
    this.requestDelay = 2500; // 2.5 seconds between requests
    this.maxRetries = 3;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];
  }

  async initialize() {
    console.log('🚀 Initializing React Bits scraper...');
    
    // Ensure cache directory exists
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.log('Cache directory already exists or error creating:', error.message);
    }

    this.browser = await puppeteer.launch({
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

    this.page = await this.browser.newPage();
    
    // Set random user agent
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await this.page.setUserAgent(userAgent);
    
    // Set viewport and headers
    await this.page.setViewport({ width: 1366, height: 768 });
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    console.log('✅ Scraper initialized successfully');
  }

  async delay(ms = this.requestDelay) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryRequest(requestFunction, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await requestFunction();
      } catch (error) {
        console.log(`⚠️ Request failed (attempt ${i + 1}/${retries}):`, error.message);
        if (i === retries - 1) throw error;
        await this.delay(this.requestDelay * (i + 1)); // Exponential backoff
      }
    }
  }

  async scrapeRepositoryOverview() {
    console.log('📊 Scraping repository overview...');
    
    await this.retryRequest(async () => {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    });

    await this.delay();

    const overview = await this.page.evaluate(() => {
      const data = {};
      
      // Repository statistics - using more specific selectors
      const starsElement = document.querySelector('#repo-stars-counter-star');
      const forksElement = document.querySelector('#repo-network-counter');
      const watchersElement = document.querySelector('#repo-notifications-counter');
      
      data.stars = starsElement?.textContent?.trim() || '0';
      data.forks = forksElement?.textContent?.trim() || '0'; 
      data.watchers = watchersElement?.textContent?.trim() || '0';

      // Repository description and topics
      const descriptionEl = document.querySelector('p[data-repository-hovercards-enabled]');
      data.description = descriptionEl?.textContent?.trim() || '';
      
      // Topics
      const topicsContainer = document.querySelector('.BorderGrid-cell .d-flex.flex-wrap');
      data.topics = [];
      if (topicsContainer) {
        const topicLinks = topicsContainer.querySelectorAll('a.topic-tag');
        data.topics = Array.from(topicLinks).map(link => link.textContent.trim());
      }

      // Language breakdown - improved selector
      const languageBar = document.querySelector('.BorderGrid .Progress');
      data.languages = {};
      if (languageBar) {
        const languageItems = languageBar.querySelectorAll('span[style*="width"]');
        languageItems.forEach(item => {
          const ariaLabel = item.getAttribute('aria-label');
          if (ariaLabel) {
            const match = ariaLabel.match(/(\w+)\s+([\d.]+)%/);
            if (match) {
              data.languages[match[1]] = match[2] + '%';
            }
          }
        });
      }

      // License information
      const licenseLink = document.querySelector('a[href*="/blob/main/LICENSE"]');
      data.license = licenseLink?.textContent?.trim() || 'Not specified';

      // Commit count
      const commitsLink = document.querySelector('a[href*="/commits/main"]');
      data.commits = commitsLink?.querySelector('strong')?.textContent?.trim() || '0';

      // Issues and PRs - improved selectors
      const issuesTab = document.querySelector('[data-content="Issues"] .Counter');
      const prsTab = document.querySelector('[data-content="Pull requests"] .Counter');
      data.issues = issuesTab?.textContent?.trim() || '0';
      data.pullRequests = prsTab?.textContent?.trim() || '0';

      return data;
    });

    // Scrape README content
    console.log('📖 Extracting README content...');
    await this.delay();
    
    const readmeContent = await this.page.evaluate(() => {
      const readmeContainer = document.querySelector('[data-testid="readme"] .markdown-body');
      return readmeContainer ? readmeContainer.innerHTML : '';
    });

    this.results.repositoryOverview = {
      ...overview,
      readme: readmeContent,
      scrapedAt: new Date().toISOString()
    };

    console.log('✅ Repository overview scraped successfully');
  }

  async scrapeDirectoryStructure() {
    console.log('🗂️ Analyzing directory structure...');
    
    const structure = await this.exploreDirectory('');
    this.results.directoryStructure = {
      tree: structure,
      scrapedAt: new Date().toISOString()
    };

    console.log('✅ Directory structure analysis complete');
  }

  async exploreDirectory(path = '') {
    const url = path ? `${this.baseUrl}/tree/main/${path}` : this.baseUrl;
    
    await this.retryRequest(async () => {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    });

    await this.delay();

    const directoryData = await this.page.evaluate((currentPath) => {
      const items = [];
      
      // Try multiple selectors for file listing
      let fileRows = document.querySelectorAll('[role="rowgroup"] [role="row"]');
      
      if (fileRows.length === 0) {
        // Fallback selector for file tree
        fileRows = document.querySelectorAll('.js-navigation-item');
      }
      
      if (fileRows.length === 0) {
        // Another fallback
        fileRows = document.querySelectorAll('[data-testid="file-tree-item"]');
      }
      
      console.log('Found file rows:', fileRows.length);
      
      fileRows.forEach(row => {
        const nameCell = row.querySelector('a[title], .Link--primary, [role="gridcell"] a');
        const typeIcon = row.querySelector('svg[aria-label]');
        
        if (nameCell && nameCell.textContent.trim() !== '..' && nameCell.textContent.trim() !== '') {
          const name = nameCell.textContent.trim();
          const isDirectory = typeIcon?.getAttribute('aria-label')?.includes('Directory') || 
                             typeIcon?.getAttribute('aria-label') === 'Directory' ||
                             nameCell.getAttribute('href')?.includes('/tree/');
          
          items.push({
            name,
            path: currentPath ? `${currentPath}/${name}` : name,
            type: isDirectory ? 'directory' : 'file',
            href: nameCell.getAttribute('href')
          });
        }
      });
      
      return items;
    }, path);

    // Recursively explore subdirectories (with limits to prevent infinite loops)
    const structure = {
      files: directoryData.filter(item => item.type === 'file'),
      directories: {}
    };

    // Limit recursion depth and number of directories to prevent excessive requests
    const maxDepth = 4;
    const currentDepth = path.split('/').filter(p => p).length;
    
    if (currentDepth < maxDepth) {
      const directories = directoryData.filter(item => item.type === 'directory').slice(0, 20); // Limit directories
      
      for (const dir of directories) {
        console.log(`📁 Exploring directory: ${dir.path}`);
        try {
          structure.directories[dir.name] = await this.exploreDirectory(dir.path);
        } catch (error) {
          console.log(`⚠️ Failed to explore directory ${dir.path}:`, error.message);
          structure.directories[dir.name] = { error: error.message };
        }
      }
    }

    return structure;
  }

  async extractConfigurationFiles() {
    console.log('⚙️ Extracting configuration files...');
    
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.js',
      'next.config.ts',
      'tailwind.config.js',
      'tailwind.config.ts',
      'postcss.config.js',
      '.eslintrc.json',
      '.eslintrc.js',
      '.prettierrc',
      '.prettierrc.json',
      'webpack.config.js',
      'vite.config.js',
      'vite.config.ts',
      '.gitignore',
      'Dockerfile',
      'docker-compose.yml',
      'vercel.json',
      'netlify.toml'
    ];

    for (const file of configFiles) {
      try {
        console.log(`📄 Fetching ${file}...`);
        const content = await this.fetchRawFileContent(file);
        if (content) {
          this.results.configurationFiles[file] = content;
        }
        await this.delay(1000); // Shorter delay for raw file requests
      } catch (error) {
        console.log(`⚠️ Could not fetch ${file}:`, error.message);
      }
    }

    console.log('✅ Configuration files extracted');
  }

  async fetchRawFileContent(filePath) {
    const url = `${this.rawUrl}/${filePath}`;
    
    return await this.retryRequest(async () => {
      const response = await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      if (response.status() === 404) {
        return null; // File doesn't exist
      }
      
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}`);
      }
      
      const content = await this.page.content();
      // Extract content from the pre tag (GitHub wraps raw content in pre)
      const match = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
      return match ? match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : content;
    });
  }

  async analyzeComponentStructure() {
    console.log('🧩 Analyzing component structure...');
    
    // Navigate to potential component directories
    const componentPaths = ['src/components', 'components', 'src', 'lib'];
    
    for (const basePath of componentPaths) {
      try {
        console.log(`🔍 Exploring ${basePath} for components...`);
        const structure = await this.exploreComponentDirectory(basePath);
        if (structure && Object.keys(structure).length > 0) {
          this.results.componentAnalysis[basePath] = structure;
        }
      } catch (error) {
        console.log(`⚠️ Could not analyze ${basePath}:`, error.message);
      }
    }

    console.log('✅ Component structure analysis complete');
  }

  async exploreComponentDirectory(path) {
    const url = `${this.baseUrl}/tree/main/${path}`;
    
    try {
      await this.retryRequest(async () => {
        await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      });

      await this.delay();

      return await this.page.evaluate(() => {
        const fileRows = document.querySelectorAll('[role="rowgroup"] [role="row"]');
        const components = [];
        const directories = [];
        
        fileRows.forEach(row => {
          const nameCell = row.querySelector('[role="gridcell"] a');
          const typeIcon = row.querySelector('svg[aria-label]');
          
          if (nameCell && nameCell.textContent.trim() !== '..') {
            const name = nameCell.textContent.trim();
            const isDirectory = typeIcon?.getAttribute('aria-label') === 'Directory';
            
            if (isDirectory) {
              directories.push(name);
            } else if (name.match(/\.(tsx?|jsx?)$/)) {
              components.push(name);
            }
          }
        });
        
        return { components, directories };
      });
    } catch (error) {
      console.log(`Could not access ${path}:`, error.message);
      return null;
    }
  }

  async investigateArchitecture() {
    console.log('🏗️ Investigating source code architecture...');
    
    // Look for key architectural files
    const architecturalFiles = [
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/pages/_app.tsx',
      'src/pages/index.tsx',
      'src/index.tsx',
      'src/main.tsx',
      'README.md',
      'CONTRIBUTING.md',
      'docs/README.md'
    ];

    const architecture = {};

    for (const file of architecturalFiles) {
      try {
        const content = await this.fetchRawFileContent(file);
        if (content) {
          architecture[file] = content.slice(0, 5000); // First 5000 chars to avoid overwhelming output
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch ${file}:`, error.message);
      }
    }

    this.results.architecturalInsights = {
      keyFiles: architecture,
      scrapedAt: new Date().toISOString()
    };

    console.log('✅ Architecture investigation complete');
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `react-bits-analysis-${timestamp}.json`;
    const filepath = path.join(this.cacheDir, filename);
    
    try {
      await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
      console.log(`💾 Results saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to save results:', error.message);
      throw error;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async run() {
    try {
      await this.initialize();
      
      // Phase 1: Repository Overview
      await this.scrapeRepositoryOverview();
      
      // Phase 2: Directory Structure
      await this.scrapeDirectoryStructure();
      
      // Phase 3: Configuration Files
      await this.extractConfigurationFiles();
      
      // Phase 4: Component Analysis
      await this.analyzeComponentStructure();
      
      // Phase 5: Architecture Investigation
      await this.investigateArchitecture();
      
      // Save results
      const filepath = await this.saveResults();
      
      console.log('🎉 Scraping completed successfully!');
      console.log('📊 Results summary:');
      console.log(`- Repository stats: ${Object.keys(this.results.repositoryOverview).length} properties`);
      console.log(`- Directory structure: ${JSON.stringify(this.results.directoryStructure).length} characters`);
      console.log(`- Configuration files: ${Object.keys(this.results.configurationFiles).length} files`);
      console.log(`- Component analysis: ${Object.keys(this.results.componentAnalysis).length} paths`);
      console.log(`- Architecture files: ${Object.keys(this.results.architecturalInsights.keyFiles || {}).length} files`);
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Scraping failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use
module.exports = ReactBitsScraper;

// Run if called directly
if (require.main === module) {
  (async () => {
    const scraper = new ReactBitsScraper();
    try {
      await scraper.run();
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}