const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;

puppeteer.use(StealthPlugin());

class GitHubAPIScraper {
  constructor() {
    this.baseUrl = 'https://github.com/DavidHDev/react-bits';
    this.apiUrl = 'https://api.github.com/repos/DavidHDev/react-bits';
    this.rawUrl = 'https://raw.githubusercontent.com/DavidHDev/react-bits/main';
    this.browser = null;
    this.page = null;
    this.requestDelay = 1000;
  }

  async initialize() {
    console.log('🚀 Initializing GitHub API scraper...');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    console.log('✅ Scraper initialized');
  }

  async delay(ms = this.requestDelay) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchGitHubAPI(endpoint) {
    const url = `${this.apiUrl}${endpoint}`;
    console.log(`🌐 Fetching: ${url}`);
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      await this.delay();
      
      const content = await this.page.content();
      const jsonMatch = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      return null;
    } catch (error) {
      console.log(`⚠️ API request failed: ${error.message}`);
      return null;
    }
  }

  async getRepositoryInfo() {
    console.log('📊 Fetching repository information...');
    const repoData = await this.fetchGitHubAPI('');
    
    if (repoData) {
      return {
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
        language: repoData.language,
        topics: repoData.topics || [],
        license: repoData.license?.name || 'Not specified',
        defaultBranch: repoData.default_branch,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
        size: repoData.size
      };
    }
    
    return {};
  }

  async getDirectoryTree() {
    console.log('🌳 Fetching complete directory tree...');
    const treeData = await this.fetchGitHubAPI('/git/trees/main?recursive=1');
    
    if (treeData && treeData.tree) {
      const structure = { files: [], directories: new Set() };
      
      treeData.tree.forEach(item => {
        if (item.type === 'blob') {
          structure.files.push({
            path: item.path,
            size: item.size,
            sha: item.sha,
            name: item.path.split('/').pop(),
            directory: item.path.includes('/') ? item.path.substring(0, item.path.lastIndexOf('/')) : 'root'
          });
        } else if (item.type === 'tree') {
          structure.directories.add(item.path);
        }
      });
      
      return {
        totalFiles: structure.files.length,
        totalDirectories: structure.directories.size,
        files: structure.files,
        directories: Array.from(structure.directories).sort()
      };
    }
    
    return {};
  }

  async getLanguageStats() {
    console.log('📈 Fetching language statistics...');
    const langData = await this.fetchGitHubAPI('/languages');
    
    if (langData) {
      const total = Object.values(langData).reduce((sum, bytes) => sum + bytes, 0);
      const languages = {};
      
      Object.entries(langData).forEach(([lang, bytes]) => {
        languages[lang] = {
          bytes: bytes,
          percentage: ((bytes / total) * 100).toFixed(1) + '%'
        };
      });
      
      return languages;
    }
    
    return {};
  }

  async getContributors() {
    console.log('👥 Fetching contributors...');
    const contributors = await this.fetchGitHubAPI('/contributors');
    
    if (contributors && Array.isArray(contributors)) {
      return contributors.map(contributor => ({
        login: contributor.login,
        contributions: contributor.contributions,
        avatarUrl: contributor.avatar_url,
        htmlUrl: contributor.html_url
      }));
    }
    
    return [];
  }

  async getReleases() {
    console.log('🚀 Fetching releases...');
    const releases = await this.fetchGitHubAPI('/releases');
    
    if (releases && Array.isArray(releases)) {
      return releases.slice(0, 10).map(release => ({
        name: release.name,
        tagName: release.tag_name,
        publishedAt: release.published_at,
        body: release.body,
        htmlUrl: release.html_url
      }));
    }
    
    return [];
  }

  async analyzeComponentStructure(directoryTree) {
    console.log('🧩 Analyzing component structure...');
    
    const componentFiles = directoryTree.files.filter(file => 
      file.name.match(/\.(jsx?|tsx?)$/) && 
      (file.path.includes('component') || file.path.includes('src'))
    );

    const componentsByDirectory = {};
    componentFiles.forEach(file => {
      const dir = file.directory;
      if (!componentsByDirectory[dir]) {
        componentsByDirectory[dir] = [];
      }
      componentsByDirectory[dir].push(file);
    });

    return {
      totalComponents: componentFiles.length,
      componentsByDirectory,
      componentDirectories: Object.keys(componentsByDirectory)
    };
  }

  async run() {
    try {
      await this.initialize();
      
      const results = {
        timestamp: new Date().toISOString(),
        repository: await this.getRepositoryInfo(),
        directoryTree: await this.getDirectoryTree(),
        languages: await this.getLanguageStats(),
        contributors: await this.getContributors(),
        releases: await this.getReleases()
      };

      // Analyze components based on directory tree
      if (results.directoryTree.files) {
        results.componentAnalysis = await this.analyzeComponentStructure(results.directoryTree);
      }

      // Save results
      const filename = `github-api-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await fs.writeFile(`./scraper-cache/${filename}`, JSON.stringify(results, null, 2));
      
      console.log('✅ GitHub API scraping completed!');
      console.log(`📊 Results: ${results.directoryTree.totalFiles} files, ${results.directoryTree.totalDirectories} directories`);
      console.log(`💾 Saved to: ./scraper-cache/${filename}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Scraping failed:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the scraper
if (require.main === module) {
  (async () => {
    const scraper = new GitHubAPIScraper();
    await scraper.run();
  })();
}

module.exports = GitHubAPIScraper;