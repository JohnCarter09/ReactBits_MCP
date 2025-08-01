#!/usr/bin/env node

/**
 * Setup and Quick Start Script for ReactBits Analyzer
 * This script helps users get started quickly with the analyzer
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ReactBitsSetup {
    constructor() {
        this.steps = [
            'Check Node.js version',
            'Install dependencies',
            'Test basic functionality',
            'Run analysis (optional)',
            'Run scraper (optional)'
        ];
    }

    async checkNodeVersion() {
        console.log('🔍 Checking Node.js version...');
        
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        console.log(`   Current version: ${nodeVersion}`);
        
        if (majorVersion < 16) {
            console.error('   ❌ Node.js 16.0.0 or higher is required');
            console.error('   Please update Node.js: https://nodejs.org/');
            return false;
        }
        
        console.log('   ✅ Node.js version is compatible');
        return true;
    }

    async installDependencies() {
        console.log('📦 Installing dependencies...');
        
        return new Promise((resolve, reject) => {
            const npm = spawn('npm', ['install'], {
                stdio: 'inherit',
                shell: true
            });
            
            npm.on('close', (code) => {
                if (code === 0) {
                    console.log('   ✅ Dependencies installed successfully');
                    resolve(true);
                } else {
                    console.error('   ❌ Failed to install dependencies');
                    reject(new Error('npm install failed'));
                }
            });
            
            npm.on('error', (error) => {
                console.error('   ❌ Failed to run npm install:', error.message);
                reject(error);
            });
        });
    }

    async testBasicFunctionality() {
        console.log('🧪 Testing basic functionality...');
        
        return new Promise((resolve, reject) => {
            const test = spawn('node', ['test-analyzer.js'], {
                stdio: 'inherit',
                shell: true
            });
            
            test.on('close', (code) => {
                if (code === 0) {
                    console.log('   ✅ Basic functionality test passed');
                    resolve(true);
                } else {
                    console.error('   ❌ Basic functionality test failed');
                    reject(new Error('Test failed'));
                }
            });
            
            test.on('error', (error) => {
                console.error('   ❌ Failed to run test:', error.message);
                reject(error);
            });
        });
    }

    async runAnalysis() {
        console.log('🔍 Running ReactBits.dev analysis...');
        console.log('   ⏳ This may take 1-2 minutes...');
        
        return new Promise((resolve, reject) => {
            const analyzer = spawn('node', ['reactbits-analyzer.js'], {
                stdio: 'inherit',
                shell: true
            });
            
            analyzer.on('close', (code) => {
                if (code === 0) {
                    console.log('   ✅ Analysis completed successfully');
                    resolve(true);
                } else {
                    console.error('   ❌ Analysis failed');
                    reject(new Error('Analysis failed'));
                }
            });
            
            analyzer.on('error', (error) => {
                console.error('   ❌ Failed to run analyzer:', error.message);
                reject(error);
            });
        });
    }

    async runScraper() {
        console.log('🕷️  Running example scraper...');
        console.log('   ⏳ This will scrape a few components as demonstration...');
        
        return new Promise((resolve, reject) => {
            const scraper = spawn('node', ['example-scraper.js', '--max=3'], {
                stdio: 'inherit',
                shell: true
            });
            
            scraper.on('close', (code) => {
                if (code === 0) {
                    console.log('   ✅ Scraper demo completed successfully');
                    resolve(true);
                } else {
                    console.error('   ❌ Scraper demo failed');
                    reject(new Error('Scraper failed'));
                }
            });
            
            scraper.on('error', (error) => {
                console.error('   ❌ Failed to run scraper:', error.message);
                reject(error);
            });
        });
    }

    async askUserChoice(question, defaultAnswer = false) {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            readline.question(`${question} (y/n) [${defaultAnswer ? 'y' : 'n'}]: `, (answer) => {
                readline.close();
                const result = answer.toLowerCase() === 'y' || 
                              (answer === '' && defaultAnswer);
                resolve(result);
            });
        });
    }

    async showResults() {
        console.log('\n📊 Generated Files:');
        
        try {
            const files = await fs.readdir(__dirname);
            
            // Analysis results
            const analysisFiles = files.filter(f => f.startsWith('reactbits-analysis-') && f.endsWith('.json'));
            if (analysisFiles.length > 0) {
                console.log(`   📋 Analysis Report: ${analysisFiles[analysisFiles.length - 1]}`);
            }
            
            // Scraper results
            const scraperFiles = files.filter(f => f.startsWith('reactbits-data-') && f.endsWith('.json'));
            if (scraperFiles.length > 0) {
                console.log(`   🕷️  Scraper Data: ${scraperFiles[scraperFiles.length - 1]}`);
            }
            
            console.log('\n📚 Available Scripts:');
            console.log('   • node reactbits-analyzer.js     - Run full analysis');
            console.log('   • node example-scraper.js        - Run example scraper');
            console.log('   • node test-analyzer.js          - Run basic tests');
            console.log('   • npm run analyze                - Run analysis via npm');
            
        } catch (error) {
            console.log('   ⚠️ Could not list generated files');
        }
    }

    async run() {
        console.log('🚀 ReactBits.dev Analyzer Setup');
        console.log('=' .repeat(50));
        
        try {
            // Step 1: Check Node.js
            const nodeOk = await this.checkNodeVersion();
            if (!nodeOk) {
                process.exit(1);
            }
            
            console.log('');
            
            // Step 2: Install dependencies
            try {
                await this.installDependencies();
            } catch (error) {
                console.error('Failed to install dependencies. You can try manually:');
                console.error('npm install');
                
                const continueAnyway = await this.askUserChoice('Continue without installing dependencies?', false);
                if (!continueAnyway) {
                    process.exit(1);
                }
            }
            
            console.log('');
            
            // Step 3: Test basic functionality
            try {
                await this.testBasicFunctionality();
            } catch (error) {
                console.error('Basic functionality test failed');
                const continueAnyway = await this.askUserChoice('Continue anyway?', false);
                if (!continueAnyway) {
                    process.exit(1);
                }
            }
            
            console.log('');
            
            // Step 4: Optional analysis
            const runAnalysis = await this.askUserChoice('Run full ReactBits.dev analysis now? (requires internet)', false);
            if (runAnalysis) {
                try {
                    await this.runAnalysis();
                } catch (error) {
                    console.error('Analysis failed, but setup continues...');
                }
            }
            
            console.log('');
            
            // Step 5: Optional scraper demo
            const runScraper = await this.askUserChoice('Run scraper demonstration? (requires internet)', false);
            if (runScraper) {
                try {
                    await this.runScraper();
                } catch (error) {
                    console.error('Scraper demo failed, but setup continues...');
                }
            }
            
            console.log('\n' + '=' .repeat(50));
            console.log('🎉 Setup completed successfully!');
            
            await this.showResults();
            
            console.log('\n💡 Tips:');
            console.log('   • Run analysis first to understand the site structure');
            console.log('   • Use analysis results to inform your scraping strategy');
            console.log('   • Implement rate limiting to be respectful to the server');
            console.log('   • Check robots.txt and terms of service before scraping');
            
        } catch (error) {
            console.error('\n💥 Setup failed:', error.message);
            console.error('\nYou can still try running individual scripts manually:');
            console.error('   node test-analyzer.js');
            console.error('   node reactbits-analyzer.js');
            process.exit(1);
        }
    }
}

// CLI execution
if (require.main === module) {
    const setup = new ReactBitsSetup();
    setup.run().catch(error => {
        console.error('Setup script failed:', error.message);
        process.exit(1);
    });
}

module.exports = ReactBitsSetup;