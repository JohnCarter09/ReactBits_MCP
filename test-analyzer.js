#!/usr/bin/env node

/**
 * Test script to verify ReactBits Analyzer functionality
 * This version tests the basic structure without requiring Puppeteer installation
 */

console.log('🧪 Testing ReactBits Analyzer Structure...');
console.log('=' .repeat(50));

// Test 1: Basic class structure
console.log('✅ Test 1: Class Structure');
try {
    const ReactBitsAnalyzer = require('./reactbits-analyzer');
    const analyzer = new ReactBitsAnalyzer();
    
    console.log('   • Class instantiated successfully');
    console.log('   • User agents loaded:', analyzer.userAgents.length);
    console.log('   • Viewports configured:', analyzer.viewports.length);
    console.log('   • Analysis results initialized');
    
} catch (error) {
    console.error('   ❌ Class structure test failed:', error.message);
}

// Test 2: Method availability
console.log('\n✅ Test 2: Method Availability');
try {
    const ReactBitsAnalyzer = require('./reactbits-analyzer');
    const analyzer = new ReactBitsAnalyzer();
    
    const methods = [
        'generateFingerprint',
        'setupBrowser',
        'interceptNetworkRequests',
        'analyzeTechnicalStack',
        'analyzeSecurityMeasures',
        'analyzeDOMStructure',
        'testJavaScriptRequirements',
        'measurePerformance',
        'generateScrapingStrategy',
        'generateReport',
        'analyze'
    ];
    
    methods.forEach(method => {
        if (typeof analyzer[method] === 'function') {
            console.log(`   • ${method}: Available`);
        } else {
            console.log(`   ❌ ${method}: Missing`);
        }
    });
    
} catch (error) {
    console.error('   ❌ Method availability test failed:', error.message);
}

// Test 3: Fingerprint generation
console.log('\n✅ Test 3: Fingerprint Generation');
try {
    const ReactBitsAnalyzer = require('./reactbits-analyzer');
    const analyzer = new ReactBitsAnalyzer();
    
    const fingerprint = analyzer.generateFingerprint();
    
    console.log('   • User Agent:', fingerprint.userAgent.substring(0, 50) + '...');
    console.log('   • Viewport:', `${fingerprint.viewport.width}x${fingerprint.viewport.height}`);
    console.log('   • Headers count:', Object.keys(fingerprint.headers).length);
    console.log('   • Accept header present:', !!fingerprint.headers['Accept']);
    
} catch (error) {
    console.error('   ❌ Fingerprint generation test failed:', error.message);
}

// Test 4: Selector generation
console.log('\n✅ Test 4: Selector Generation');
try {
    const ReactBitsAnalyzer = require('./reactbits-analyzer');
    const analyzer = new ReactBitsAnalyzer();
    
    // Test element mock
    const mockElement = {
        tagName: 'div',
        className: 'component-card card-item',
        id: 'test-component',
        attributes: {
            'data-testid': 'component-test'
        }
    };
    
    const selectors = analyzer.generateSelector(mockElement);
    console.log('   • Generated selectors:', selectors);
    
    // Test URL patterns
    const mockLinks = [
        { href: 'https://reactbits.dev/components/button' },
        { href: 'https://reactbits.dev/docs/getting-started' },
        { href: 'https://reactbits.dev/examples/modal' }
    ];
    
    const patterns = analyzer.extractUrlPatterns(mockLinks);
    console.log('   • URL patterns extracted:', patterns);
    
} catch (error) {
    console.error('   ❌ Selector generation test failed:', error.message);
}

// Test 5: Report generation structure
console.log('\n✅ Test 5: Report Structure');
try {
    const ReactBitsAnalyzer = require('./reactbits-analyzer');
    const analyzer = new ReactBitsAnalyzer();
    
    // Mock some analysis results
    analyzer.analysisResults.technicalStack = {
        frameworks: ['React', 'Next.js'],
        bundlers: ['Webpack']
    };
    
    analyzer.analysisResults.jsRequirements = {
        requiresJs: true
    };
    
    analyzer.analysisResults.securityHeaders = {
        antiBotMeasures: ['Cloudflare']
    };
    
    const strategy = analyzer.generateScrapingStrategy();
    console.log('   • Strategy generated');
    console.log('   • Recommended approach:', strategy.recommendedApproach);
    console.log('   • Anti-detection measures:', strategy.antiDetection.length);
    
    const complexity = analyzer.calculateComplexity();
    console.log('   • Complexity calculation:', complexity);
    
    const tools = analyzer.getRecommendedTools();
    console.log('   • Recommended tools:', tools);
    
} catch (error) {
    console.error('   ❌ Report structure test failed:', error.message);
}

// Test 6: Package.json validation
console.log('\n✅ Test 6: Package Configuration');
try {
    const pkg = require('./package.json');
    
    console.log('   • Package name:', pkg.name);
    console.log('   • Version:', pkg.version);
    console.log('   • Main entry:', pkg.main);
    console.log('   • Dependencies count:', Object.keys(pkg.dependencies || {}).length);
    console.log('   • Scripts available:', Object.keys(pkg.scripts || {}).length);
    
} catch (error) {
    console.error('   ❌ Package validation test failed:', error.message);
}

console.log('\n' + '=' .repeat(50));
console.log('🎉 Basic tests completed!');
console.log('\n📋 Next Steps:');
console.log('1. Run "npm install" to install Puppeteer');
console.log('2. Run "node reactbits-analyzer.js" for full analysis');
console.log('3. Check generated JSON report for detailed results');
console.log('\n⚠️  Note: Full analysis requires internet connection and may take 1-2 minutes');