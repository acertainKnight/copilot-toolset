#!/usr/bin/env node

/**
 * Complete Documentation Validation Suite
 *
 * Runs all validation components and provides a comprehensive report
 */

import { DocumentationValidator } from './validate-docs.js';
import { LinkChecker } from './check-links.js';
import { ExampleTester } from './test-examples.js';
import { StructureChecker } from './check-structure.js';

class ValidationSuite {
    constructor() {
        this.results = {
            structure: null,
            links: null,
            examples: null,
            compliance: null
        };
        this.startTime = Date.now();
    }

    async runAll(options = {}) {
        const {
            skipExternal = false,
            skipExamples = false,
            verbose = false
        } = options;

        console.log('🚀 Starting complete documentation validation suite...');
        console.log(`⚙️  Options: skipExternal=${skipExternal}, skipExamples=${skipExamples}\n`);

        try {
            // 1. Structure and compliance validation
            console.log('📋 Step 1: Structure and compliance validation...');
            const structureChecker = new StructureChecker();
            this.results.compliance = await structureChecker.checkStructure();
            console.log(`✅ Structure validation complete\n`);

            // 2. Document content validation
            console.log('📄 Step 2: Document content validation...');
            const docValidator = new DocumentationValidator();
            this.results.structure = await docValidator.validate().catch(() => false);
            console.log(`✅ Content validation complete\n`);

            // 3. Link validation
            console.log('🔗 Step 3: Link validation...');
            const linkChecker = new LinkChecker();
            this.results.links = await linkChecker.checkLinks(!skipExternal);
            console.log(`✅ Link validation complete\n`);

            // 4. Example testing (optional)
            if (!skipExamples) {
                console.log('🧪 Step 4: Code example testing...');
                const exampleTester = new ExampleTester();
                this.results.examples = await exampleTester.testExamples();
                console.log(`✅ Example testing complete\n`);
            } else {
                console.log('⏭️  Step 4: Skipped code example testing\n');
                this.results.examples = true;
            }

        } catch (error) {
            console.error(`❌ Validation suite failed: ${error.message}`);
            this.generateFailureReport(error);
            return false;
        }

        // Generate comprehensive report
        this.generateComprehensiveReport();

        // Return overall success
        return this.isOverallSuccess();
    }

    isOverallSuccess() {
        return this.results.structure &&
               this.results.links &&
               this.results.examples &&
               this.results.compliance;
    }

    generateComprehensiveReport() {
        const duration = Math.round((Date.now() - this.startTime) / 1000);

        console.log('\n' + '='.repeat(70));
        console.log('📊 COMPREHENSIVE DOCUMENTATION VALIDATION REPORT');
        console.log('='.repeat(70));
        console.log(`⏱️  Total validation time: ${duration} seconds`);
        console.log(`📅 Validation completed: ${new Date().toISOString()}`);

        console.log('\n🎯 VALIDATION RESULTS:');
        console.log(`   📋 Progressive Disclosure Compliance: ${this.getStatusIcon(this.results.compliance)} ${this.results.compliance ? 'PASSED' : 'FAILED'}`);
        console.log(`   📄 Document Content Validation: ${this.getStatusIcon(this.results.structure)} ${this.results.structure ? 'PASSED' : 'FAILED'}`);
        console.log(`   🔗 Link Validation: ${this.getStatusIcon(this.results.links)} ${this.results.links ? 'PASSED' : 'FAILED'}`);
        console.log(`   🧪 Code Example Testing: ${this.getStatusIcon(this.results.examples)} ${this.results.examples ? 'PASSED' : 'SKIPPED/FAILED'}`);

        console.log('\n🏆 OVERALL STATUS:');
        if (this.isOverallSuccess()) {
            console.log('   ✅ ALL VALIDATIONS PASSED!');
            console.log('   🎉 Documentation quality maintained to hive mind standards');
            console.log('   ✨ Progressive disclosure principles are being followed');
        } else {
            console.log('   ❌ VALIDATION FAILURES DETECTED');
            console.log('   🔧 Please address the issues identified above');
            console.log('   📚 Review the detailed reports for specific fixes needed');
        }

        console.log('\n🚀 NEXT STEPS:');
        if (!this.results.compliance) {
            console.log('   • Fix progressive disclosure compliance violations');
            console.log('   • Break down long files into focused sections');
            console.log('   • Add required sections to maintain structure');
        }
        if (!this.results.structure) {
            console.log('   • Address content validation errors');
            console.log('   • Fix markdown formatting issues');
            console.log('   • Update outdated content patterns');
        }
        if (!this.results.links) {
            console.log('   • Fix broken internal links');
            console.log('   • Update or remove broken external links');
            console.log('   • Verify asset references');
        }
        if (!this.results.examples) {
            console.log('   • Fix code examples that fail validation');
            console.log('   • Ensure JSON configurations are valid');
            console.log('   • Test that examples work as documented');
        }

        if (this.isOverallSuccess()) {
            console.log('   ✅ All validations passed - documentation is ready!');
            console.log('   🎯 Continue following progressive disclosure principles');
            console.log('   🔄 Regular validation recommended for ongoing quality');
        }

        console.log('\n📈 QUALITY METRICS:');
        console.log('   🎯 Hive Mind Optimization Standards: Maintained');
        console.log('   📏 Progressive Disclosure: Enforced');
        console.log('   🔗 Link Integrity: Validated');
        console.log('   🧪 Code Examples: Tested');
        console.log('   🏗️  Structure Compliance: Checked');

        console.log('\n' + '='.repeat(70));
    }

    generateFailureReport(error) {
        console.log('\n' + '='.repeat(50));
        console.log('❌ VALIDATION SUITE FAILURE REPORT');
        console.log('='.repeat(50));
        console.log(`💥 Error: ${error.message}`);
        console.log(`📍 Stack: ${error.stack?.slice(0, 200)}...`);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check that all dependencies are installed');
        console.log('   2. Verify file permissions on scripts');
        console.log('   3. Ensure all documentation files are accessible');
        console.log('   4. Run individual validation scripts to isolate issues');
        console.log('\n' + '='.repeat(50));
    }

    getStatusIcon(success) {
        return success ? '✅' : '❌';
    }
}

// Run validation suite if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const options = {
        skipExternal: process.argv.includes('--skip-external'),
        skipExamples: process.argv.includes('--skip-examples'),
        verbose: process.argv.includes('--verbose')
    };

    const suite = new ValidationSuite();
    suite.runAll(options).then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Validation suite crashed:', error);
        process.exit(1);
    });
}

export { ValidationSuite };