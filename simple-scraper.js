const fs = require('fs').promises;
const path = require('path');

class ReactBitsDirectScraper {
  constructor() {
    this.baseUrl = 'https://api.github.com/repos/DavidHDev/react-bits';
    this.rawUrl = 'https://raw.githubusercontent.com/DavidHDev/react-bits/main';
    this.results = {};
  }

  async delay(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchJSON(url) {
    console.log(`🌐 Fetching: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ReactBits-Scraper/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      await this.delay(500); // Rate limiting
      return data;
    } catch (error) {
      console.log(`⚠️ Failed to fetch ${url}:`, error.message);
      return null;
    }
  }

  async fetchText(url) {
    console.log(`📄 Fetching text: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ReactBits-Scraper/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      await this.delay(500);
      return text;
    } catch (error) {
      console.log(`⚠️ Failed to fetch text ${url}:`, error.message);
      return null;
    }
  }

  async getRepositoryInfo() {
    console.log('📊 Fetching repository information...');
    const repoData = await this.fetchJSON(this.baseUrl);
    
    if (repoData) {
      return {
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
        openIssues: repoData.open_issues_count,
        language: repoData.language,
        topics: repoData.topics || [],
        license: repoData.license?.name || 'Not specified',
        defaultBranch: repoData.default_branch,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
        size: repoData.size,
        hasIssues: repoData.has_issues,
        hasProjects: repoData.has_projects,
        hasWiki: repoData.has_wiki,
        homepage: repoData.homepage
      };
    }
    
    return {};
  }

  async getCompleteDirectoryTree() {
    console.log('🌳 Fetching complete directory tree...');
    const treeData = await this.fetchJSON(`${this.baseUrl}/git/trees/main?recursive=1`);
    
    if (treeData && treeData.tree) {
      const structure = { 
        files: [], 
        directories: new Set(),
        filesByExtension: {},
        componentFiles: [],
        configFiles: []
      };
      
      treeData.tree.forEach(item => {
        if (item.type === 'blob') {
          const fileInfo = {
            path: item.path,
            size: item.size,
            sha: item.sha,
            name: item.path.split('/').pop(),
            directory: item.path.includes('/') ? item.path.substring(0, item.path.lastIndexOf('/')) : 'root',
            extension: item.path.includes('.') ? item.path.split('.').pop().toLowerCase() : ''
          };
          
          structure.files.push(fileInfo);
          
          // Categorize by extension
          if (!structure.filesByExtension[fileInfo.extension]) {
            structure.filesByExtension[fileInfo.extension] = [];
          }
          structure.filesByExtension[fileInfo.extension].push(fileInfo);
          
          // Identify component files
          if (fileInfo.extension.match(/^(jsx?|tsx?)$/)) {
            structure.componentFiles.push(fileInfo);
          }
          
          // Identify config files
          if (fileInfo.name.match(/^(package\.json|tsconfig\.json|.*\.config\.(js|ts|json)|\..*rc.*|.*\.md)$/i)) {
            structure.configFiles.push(fileInfo);
          }
          
        } else if (item.type === 'tree') {
          structure.directories.add(item.path);
        }
      });
      
      return {
        totalFiles: structure.files.length,
        totalDirectories: structure.directories.size,
        files: structure.files,
        directories: Array.from(structure.directories).sort(),
        filesByExtension: structure.filesByExtension,
        componentFiles: structure.componentFiles,
        configFiles: structure.configFiles,
        statistics: {
          jsFiles: (structure.filesByExtension.js || []).length,
          tsFiles: (structure.filesByExtension.ts || []).length,
          jsxFiles: (structure.filesByExtension.jsx || []).length,
          tsxFiles: (structure.filesByExtension.tsx || []).length,
          cssFiles: (structure.filesByExtension.css || []).length,
          mdFiles: (structure.filesByExtension.md || []).length,
          jsonFiles: (structure.filesByExtension.json || []).length
        }
      };
    }
    
    return {};
  }

  async getLanguageStats() {
    console.log('📈 Fetching language statistics...');
    const langData = await this.fetchJSON(`${this.baseUrl}/languages`);
    
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
    const contributors = await this.fetchJSON(`${this.baseUrl}/contributors`);
    
    if (contributors && Array.isArray(contributors)) {
      return contributors.map(contributor => ({
        login: contributor.login,
        contributions: contributor.contributions,
        avatarUrl: contributor.avatar_url,
        htmlUrl: contributor.html_url,
        type: contributor.type
      }));
    }
    
    return [];
  }

  async getReleases() {
    console.log('🚀 Fetching releases...');
    const releases = await this.fetchJSON(`${this.baseUrl}/releases`);
    
    if (releases && Array.isArray(releases)) {
      return releases.slice(0, 10).map(release => ({
        name: release.name,
        tagName: release.tag_name,
        publishedAt: release.published_at,
        body: release.body?.substring(0, 1000) + (release.body?.length > 1000 ? '...' : ''), // Truncate long descriptions
        htmlUrl: release.html_url,
        draft: release.draft,
        prerelease: release.prerelease
      }));
    }
    
    return [];
  }

  async getCommitStats() {
    console.log('📈 Fetching commit statistics...');
    const commits = await this.fetchJSON(`${this.baseUrl}/commits?per_page=100`);
    
    if (commits && Array.isArray(commits)) {
      const recentCommits = commits.slice(0, 20).map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        htmlUrl: commit.html_url
      }));
      
      return {
        totalFetched: commits.length,
        recentCommits: recentCommits
      };
    }
    
    return {};
  }

  async getConfigurationFiles() {
    console.log('⚙️ Fetching configuration files...');
    
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.js',
      'next.config.ts',
      'tailwind.config.js',
      'tailwind.config.ts',
      'vite.config.js',
      'vite.config.ts',
      'postcss.config.js',
      '.eslintrc.json',
      '.eslintrc.js',
      '.prettierrc',
      '.prettierrc.json',
      '.gitignore',
      'README.md',
      'CONTRIBUTING.md',
      'LICENSE',
      'LICENSE.md'
    ];

    const configs = {};

    for (const file of configFiles) {
      const content = await this.fetchText(`${this.rawUrl}/${file}`);
      if (content) {
        configs[file] = content;
      }
    }

    return configs;
  }

  async analyzeComponentStructure(directoryTree) {
    console.log('🧩 Analyzing component structure...');
    
    if (!directoryTree.componentFiles) {
      return {};
    }

    const componentsByDirectory = {};
    const componentPatterns = {};
    
    directoryTree.componentFiles.forEach(file => {
      const dir = file.directory;
      if (!componentsByDirectory[dir]) {
        componentsByDirectory[dir] = [];
      }
      componentsByDirectory[dir].push(file);
      
      // Analyze naming patterns
      const pattern = file.name.match(/([A-Z][a-z]+)/g);
      if (pattern) {
        const patternKey = pattern.join('');
        if (!componentPatterns[patternKey]) {
          componentPatterns[patternKey] = 0;
        }
        componentPatterns[patternKey]++;
      }
    });

    return {
      totalComponents: directoryTree.componentFiles.length,
      componentsByDirectory,
      componentDirectories: Object.keys(componentsByDirectory),
      namingPatterns: componentPatterns,
      typeScriptComponents: directoryTree.componentFiles.filter(f => f.extension.match(/tsx?/)).length,
      javaScriptComponents: directoryTree.componentFiles.filter(f => f.extension.match(/jsx?/)).length
    };
  }

  async run() {
    try {
      console.log('🚀 Starting React Bits comprehensive analysis...');
      
      this.results.timestamp = new Date().toISOString();
      this.results.repository = await this.getRepositoryInfo();
      this.results.directoryTree = await this.getCompleteDirectoryTree();
      this.results.languages = await this.getLanguageStats();
      this.results.contributors = await this.getContributors();
      this.results.releases = await this.getReleases();
      this.results.commits = await this.getCommitStats();
      this.results.configurationFiles = await this.getConfigurationFiles();

      // Analyze components based on directory tree
      if (this.results.directoryTree.componentFiles) {
        this.results.componentAnalysis = await this.analyzeComponentStructure(this.results.directoryTree);
      }

      // Save results
      const filename = `react-bits-complete-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filepath = `./scraper-cache/${filename}`;
      
      await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
      
      console.log('🎉 Analysis completed successfully!');
      console.log('📊 Summary:');
      console.log(`- Repository: ${this.results.repository.name} (${this.results.repository.stars} stars)`);
      console.log(`- Files: ${this.results.directoryTree.totalFiles} total, ${this.results.directoryTree.componentFiles?.length || 0} components`);
      console.log(`- Directories: ${this.results.directoryTree.totalDirectories}`);
      console.log(`- Languages: ${Object.keys(this.results.languages).length}`);
      console.log(`- Contributors: ${this.results.contributors.length}`);
      console.log(`- Configuration files: ${Object.keys(this.results.configurationFiles).length}`);
      console.log(`💾 Results saved to: ${filepath}`);
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }
}

// Run the scraper
if (require.main === module) {
  (async () => {
    const scraper = new ReactBitsDirectScraper();
    await scraper.run();
  })();
}

module.exports = ReactBitsDirectScraper;