#!/usr/bin/env node

/**
 * Test script for React Bits Extractor
 * 
 * This script tests the extractor functionality and validates the extraction process
 */

const ReactBitsExtractor = require('./react-bits-extractor');
const fs = require('fs').promises;
const path = require('path');

class ExtractorTester {
    constructor() {
        this.testOutputDir = './test-extraction';
        this.extractor = new ReactBitsExtractor({
            outputDir: this.testOutputDir,
            maxRetries: 2,
            requestDelay: 500, // Faster for testing
            includeUtilities: true,
            extractAllVariants: true
        });
    }

    async runTests() {
        console.log('🧪 Starting React Bits Extractor Tests...\n');

        try {
            // Test 1: Repository Structure Mapping
            await this.testRepositoryMapping();
            
            // Test 2: Component Discovery
            await this.testComponentDiscovery();
            
            // Test 3: Limited Extraction (first 5 components)
            await this.testLimitedExtraction();
            
            // Test 4: Utility Functions
            await this.testUtilityFunctions();
            
            // Test 5: Report Generation
            await this.testReportGeneration();

            console.log('\n✅ All tests completed successfully!');
            
        } catch (error) {
            console.error('\n❌ Tests failed:', error.message);
            throw error;
        }
    }

    async testRepositoryMapping() {
        console.log('🗺️  Test 1: Repository Structure Mapping');
        
        const structure = await this.extractor.mapRepositoryStructure();
        
        // Validate structure
        if (!structure.root || !Array.isArray(structure.root)) {
            throw new Error('Failed to map root directory');
        }
        
        if (!structure.src || !Array.isArray(structure.src)) {
            throw new Error('Failed to map src directory');
        }
        
        console.log(`   ✅ Mapped ${Object.keys(structure).length} directories`);
        console.log(`   📁 Root files: ${structure.root.length}`);
        console.log(`   📁 Src files: ${structure.src.length}`);
        
        if (structure.components) {
            console.log(`   📁 Component files: ${structure.components.length}`);
        }
    }

    async testComponentDiscovery() {
        console.log('\n🔍 Test 2: Component Discovery');
        
        const components = await this.extractor.discoverComponents();
        
        if (components.length === 0) {
            throw new Error('No components discovered');
        }
        
        console.log(`   ✅ Discovered ${components.length} components`);
        
        // Categorize components
        const categories = {};
        const variants = {};
        
        components.forEach(comp => {
            categories[comp.category] = (categories[comp.category] || 0) + 1;
            variants[comp.variant] = (variants[comp.variant] || 0) + 1;
        });
        
        console.log('   📊 Categories:', categories);
        console.log('   📊 Variants:', variants);
        
        // Find priority components
        const highPriority = components.filter(c => c.priority > 5);
        console.log(`   🎯 High priority components: ${highPriority.length}`);
        
        if (highPriority.length > 0) {
            console.log('   Top priority:', highPriority.slice(0, 3).map(c => c.name));
        }
    }

    async testLimitedExtraction() {
        console.log('\n📦 Test 3: Limited Extraction (first 5 components)');
        
        // Get first 5 components
        const components = await this.extractor.discoverComponents();
        const limitedComponents = components.slice(0, 5);
        
        // Create test output directory
        await this.ensureDirectory(this.testOutputDir);
        
        let successCount = 0;
        let failCount = 0;
        
        for (const component of limitedComponents) {
            try {
                console.log(`   Processing: ${component.name}`);
                const sourceCode = await this.extractor.getRawFile(component.fullPath);
                
                if (!sourceCode) {
                    throw new Error('Empty source code');
                }
                
                const processed = await this.extractor.processComponent(component, sourceCode);
                
                // Validate processed component
                if (!processed.sourceCode || !processed.dependencies) {
                    throw new Error('Invalid processed component');
                }
                
                console.log(`   ✅ ${component.name} (${processed.fileSize} bytes, ${processed.dependencies.length} deps)`);
                successCount++;
                
            } catch (error) {
                console.log(`   ❌ ${component.name}: ${error.message}`);
                failCount++;
            }
        }
        
        console.log(`   📊 Success: ${successCount}, Failed: ${failCount}`);
        
        if (successCount === 0) {
            throw new Error('No components extracted successfully');
        }
    }

    async testUtilityFunctions() {
        console.log('\n🔧 Test 4: Utility Functions');
        
        // Test dependency extraction
        const testCode = `
import React from 'react';
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import './styles.css';

export const TestComponent = () => {
    return <div>Test</div>;
};
        `;
        
        const deps = this.extractor.extractDependencies(testCode);
        console.log('   📦 Dependencies extracted:', deps);
        
        if (!deps.includes('react') || !deps.includes('styled-components')) {
            throw new Error('Dependency extraction failed');
        }
        
        // Test type extraction
        const typeCode = `
interface Props {
    title: string;
    count?: number;
}

type ButtonVariant = 'primary' | 'secondary';
        `;
        
        const types = this.extractor.extractTypeDefinitions(typeCode);
        console.log('   🔤 Types extracted:', types.length);
        
        if (types.length === 0) {
            throw new Error('Type extraction failed');
        }
        
        console.log('   ✅ Utility functions working correctly');
    }

    async testReportGeneration() {
        console.log('\n📊 Test 5: Report Generation');
        
        // Simulate some component data
        this.extractor.componentData = [
            {
                name: 'TestButton',
                category: 'button',
                variant: 'ts-tailwind',
                priority: 8,
                fileSize: 1024,
                dependencies: ['react'],
                filePath: 'components/test-button.tsx'
            },
            {
                name: 'AnimatedText',
                category: 'animated-text',
                variant: 'ts-css',
                priority: 10,
                fileSize: 2048,
                dependencies: ['react', 'framer-motion'],
                filePath: 'components/animated-text.tsx'
            }
        ];
        
        this.extractor.stats = {
            totalFiles: 2,
            extractedFiles: 2,
            failedFiles: 0,
            startTime: Date.now() - 5000,
            errors: []
        };
        
        const report = await this.extractor.generateReport();
        
        if (!report.metadata || !report.statistics || !report.componentsByCategory) {
            throw new Error('Invalid report structure');
        }
        
        console.log('   ✅ Report generated successfully');
        console.log(`   📄 Categories: ${Object.keys(report.componentsByCategory).length}`);
        console.log(`   📄 Variants: ${Object.keys(report.componentsByVariant).length}`);
        console.log(`   📄 Success rate: ${report.statistics.successRate}`);
    }

    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ExtractorTester();
    
    tester.runTests().catch(error => {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = ExtractorTester;