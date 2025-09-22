#!/usr/bin/env node

/**
 * Link Checking Script with Detailed Reporting
 *
 * Validates all links in documentation files:
 * - Internal links (relative paths within project)
 * - External links (HTTP/HTTPS URLs)
 * - Anchor links (within same document)
 * - Image and asset links
 * - Detailed reporting with link categorization
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LinkChecker {
    constructor() {
        this.results = {
            internal: { valid: [], broken: [] },
            external: { valid: [], broken: [], skipped: [] },
            anchor: { valid: [], broken: [] },
            asset: { valid: [], broken: [] }
        };

        this.cache = new Map(); // Cache external link checks
        this.timeout = 5000; // 5 second timeout for external links

        // Skip checking these external domains (known to block bots)
        this.skipDomains = [
            'linkedin.com',
            'facebook.com',
            'twitter.com',
            'instagram.com'
        ];
    }

    /**
     * Main entry point for link checking
     */
    async checkLinks(checkExternal = true) {
        console.log('🔗 Starting comprehensive link validation...\n');

        const projectRoot = path.resolve(__dirname, '../..');
        const markdownFiles = await this.getMarkdownFiles(projectRoot);

        console.log(`📄 Found ${markdownFiles.length} files to check for links\n`);

        for (const file of markdownFiles) {
            await this.checkFileLinks(file, projectRoot, checkExternal);
        }

        this.generateReport();

        // Return success/failure status
        const hasErrors = this.results.internal.broken.length > 0 ||
                         this.results.anchor.broken.length > 0 ||
                         this.results.asset.broken.length > 0 ||
                         this.results.external.broken.length > 0;

        return !hasErrors;
    }

    /**
     * Get all markdown files in the project
     */
    async getMarkdownFiles(projectRoot) {
        const patterns = [
            '*.md',
            'docs/**/*.md',
            'examples/**/*.md',
            '.github/**/*.md'
        ];

        const files = [];
        for (const pattern of patterns) {
            const matches = await glob(pattern, {
                cwd: projectRoot,
                ignore: [
                    'node_modules/**',
                    'dist/**',
                    'coverage/**',
                    '.copilot/memory/**'
                ]
            });
            files.push(...matches.map(f => path.join(projectRoot, f)));
        }

        return [...new Set(files)];
    }

    /**
     * Check all links in a single file
     */
    async checkFileLinks(filePath, projectRoot, checkExternal) {
        const relativePath = path.relative(projectRoot, filePath);
        console.log(`🔍 Checking links in ${relativePath}...`);

        if (!existsSync(filePath)) {
            return;
        }

        const content = readFileSync(filePath, 'utf-8');
        const links = this.extractLinks(content);

        for (const link of links) {
            await this.checkLink(link, filePath, projectRoot, checkExternal);
        }
    }

    /**
     * Extract all types of links from markdown content
     */
    extractLinks(content) {
        const links = [];

        // Markdown links: [text](url)
        const markdownLinks = content.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g);
        for (const match of markdownLinks) {
            links.push({
                text: match[1],
                url: match[2],
                type: this.getLinkType(match[2]),
                line: this.getLineNumber(content, match.index)
            });
        }

        // HTML links: <a href="url">
        const htmlLinks = content.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi);
        for (const match of htmlLinks) {
            links.push({
                text: 'HTML link',
                url: match[1],
                type: this.getLinkType(match[1]),
                line: this.getLineNumber(content, match.index)
            });
        }

        // Image links: ![alt](src)
        const imageLinks = content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
        for (const match of imageLinks) {
            links.push({
                text: match[1] || 'Image',
                url: match[2],
                type: 'asset',
                line: this.getLineNumber(content, match.index)
            });
        }

        // HTML images: <img src="url">
        const htmlImages = content.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi);
        for (const match of htmlImages) {
            links.push({
                text: 'HTML image',
                url: match[1],
                type: 'asset',
                line: this.getLineNumber(content, match.index)
            });
        }

        return links;
    }

    /**
     * Determine link type based on URL
     */
    getLinkType(url) {
        if (url.startsWith('#')) return 'anchor';
        if (url.startsWith('http://') || url.startsWith('https://')) return 'external';
        if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) return 'asset';
        return 'internal';
    }

    /**
     * Get line number for a character position in content
     */
    getLineNumber(content, position) {
        return content.slice(0, position).split('\n').length;
    }

    /**
     * Check a single link
     */
    async checkLink(link, filePath, projectRoot, checkExternal) {
        const relativePath = path.relative(projectRoot, filePath);

        switch (link.type) {
            case 'internal':
                await this.checkInternalLink(link, filePath, projectRoot, relativePath);
                break;
            case 'external':
                if (checkExternal) {
                    await this.checkExternalLink(link, relativePath);
                } else {
                    this.results.external.skipped.push({
                        file: relativePath,
                        link: link,
                        reason: 'External link checking disabled'
                    });
                }
                break;
            case 'anchor':
                await this.checkAnchorLink(link, filePath, relativePath);
                break;
            case 'asset':
                await this.checkAssetLink(link, filePath, projectRoot, relativePath);
                break;
        }
    }

    /**
     * Check internal (relative) links
     */
    async checkInternalLink(link, filePath, projectRoot, relativePath) {
        const fileDir = path.dirname(filePath);
        let targetPath = link.url;

        // Remove anchor from path if present
        const anchorIndex = targetPath.indexOf('#');
        if (anchorIndex !== -1) {
            targetPath = targetPath.slice(0, anchorIndex);
        }

        // Skip empty paths (pure anchors are handled separately)
        if (!targetPath) return;

        const resolvedPath = path.resolve(fileDir, targetPath);

        if (existsSync(resolvedPath)) {
            this.results.internal.valid.push({
                file: relativePath,
                link: link,
                resolvedPath: path.relative(projectRoot, resolvedPath)
            });
        } else {
            this.results.internal.broken.push({
                file: relativePath,
                link: link,
                resolvedPath: path.relative(projectRoot, resolvedPath)
            });
        }
    }

    /**
     * Check external (HTTP/HTTPS) links
     */
    async checkExternalLink(link, relativePath) {
        const url = link.url;

        // Skip certain domains known to block automated requests
        const domain = this.extractDomain(url);
        if (this.skipDomains.some(skipDomain => domain.includes(skipDomain))) {
            this.results.external.skipped.push({
                file: relativePath,
                link: link,
                reason: `Domain ${domain} typically blocks automated requests`
            });
            return;
        }

        // Check cache first
        if (this.cache.has(url)) {
            const cached = this.cache.get(url);
            if (cached.valid) {
                this.results.external.valid.push({
                    file: relativePath,
                    link: link,
                    status: cached.status,
                    cached: true
                });
            } else {
                this.results.external.broken.push({
                    file: relativePath,
                    link: link,
                    error: cached.error,
                    cached: true
                });
            }
            return;
        }

        try {
            const result = await this.fetchWithTimeout(url);

            this.cache.set(url, { valid: true, status: result.status });
            this.results.external.valid.push({
                file: relativePath,
                link: link,
                status: result.status
            });

        } catch (error) {
            this.cache.set(url, { valid: false, error: error.message });
            this.results.external.broken.push({
                file: relativePath,
                link: link,
                error: error.message
            });
        }
    }

    /**
     * Check anchor links (within same document)
     */
    async checkAnchorLink(link, filePath, relativePath) {
        const content = readFileSync(filePath, 'utf-8');
        const anchor = link.url.slice(1); // Remove #

        // Create regex to match heading that would generate this anchor
        const anchorRegex = new RegExp(`^#+\\s+.*${anchor.replace(/-/g, '[-\\s]')}.*$`, 'mi');

        // Also check for explicit anchor tags
        const explicitAnchor = new RegExp(`<a\\s+[^>]*(?:name|id)=["']${anchor}["']`, 'i');

        if (anchorRegex.test(content) || explicitAnchor.test(content)) {
            this.results.anchor.valid.push({
                file: relativePath,
                link: link
            });
        } else {
            this.results.anchor.broken.push({
                file: relativePath,
                link: link,
                reason: `Anchor "#${anchor}" not found in document`
            });
        }
    }

    /**
     * Check asset links (images, etc.)
     */
    async checkAssetLink(link, filePath, projectRoot, relativePath) {
        // Handle external assets
        if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
            return this.checkExternalLink(link, relativePath);
        }

        // Handle local assets
        const fileDir = path.dirname(filePath);
        const resolvedPath = path.resolve(fileDir, link.url);

        if (existsSync(resolvedPath)) {
            this.results.asset.valid.push({
                file: relativePath,
                link: link,
                resolvedPath: path.relative(projectRoot, resolvedPath)
            });
        } else {
            this.results.asset.broken.push({
                file: relativePath,
                link: link,
                resolvedPath: path.relative(projectRoot, resolvedPath)
            });
        }
    }

    /**
     * Fetch URL with timeout
     */
    fetchWithTimeout(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https:') ? https : http;
            const timeout = setTimeout(() => {
                reject(new Error(`Request timeout after ${this.timeout}ms`));
            }, this.timeout);

            const req = protocol.get(url, (res) => {
                clearTimeout(timeout);

                // Handle redirects
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    resolve(this.fetchWithTimeout(res.headers.location));
                    return;
                }

                resolve({
                    status: res.statusCode,
                    headers: res.headers
                });
            });

            req.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });

            req.setTimeout(this.timeout, () => {
                req.destroy();
                reject(new Error(`Socket timeout after ${this.timeout}ms`));
            });
        });
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    }

    /**
     * Generate comprehensive link checking report
     */
    generateReport() {
        console.log('\n🔗 LINK VALIDATION REPORT');
        console.log('='.repeat(50));

        const totalLinks = Object.values(this.results).reduce((sum, category) =>
            sum + category.valid.length + category.broken.length + (category.skipped?.length || 0), 0);

        console.log(`📊 Total links checked: ${totalLinks}`);

        // Internal links
        console.log(`\n📁 Internal Links:`);
        console.log(`   ✅ Valid: ${this.results.internal.valid.length}`);
        console.log(`   ❌ Broken: ${this.results.internal.broken.length}`);

        // External links
        console.log(`\n🌐 External Links:`);
        console.log(`   ✅ Valid: ${this.results.external.valid.length}`);
        console.log(`   ❌ Broken: ${this.results.external.broken.length}`);
        console.log(`   ⏭️ Skipped: ${this.results.external.skipped.length}`);

        // Anchor links
        console.log(`\n⚓ Anchor Links:`);
        console.log(`   ✅ Valid: ${this.results.anchor.valid.length}`);
        console.log(`   ❌ Broken: ${this.results.anchor.broken.length}`);

        // Asset links
        console.log(`\n🖼️ Asset Links:`);
        console.log(`   ✅ Valid: ${this.results.asset.valid.length}`);
        console.log(`   ❌ Broken: ${this.results.asset.broken.length}`);

        // Show broken links details
        if (this.results.internal.broken.length > 0) {
            console.log(`\n❌ BROKEN INTERNAL LINKS:`);
            for (const item of this.results.internal.broken) {
                console.log(`   ${item.file}:${item.link.line} - "${item.link.text}" -> ${item.link.url}`);
            }
        }

        if (this.results.anchor.broken.length > 0) {
            console.log(`\n❌ BROKEN ANCHOR LINKS:`);
            for (const item of this.results.anchor.broken) {
                console.log(`   ${item.file}:${item.link.line} - "${item.link.text}" -> ${item.link.url}`);
            }
        }

        if (this.results.asset.broken.length > 0) {
            console.log(`\n❌ BROKEN ASSET LINKS:`);
            for (const item of this.results.asset.broken) {
                console.log(`   ${item.file}:${item.link.line} - "${item.link.text}" -> ${item.link.url}`);
            }
        }

        if (this.results.external.broken.length > 0) {
            console.log(`\n❌ BROKEN EXTERNAL LINKS:`);
            for (const item of this.results.external.broken) {
                console.log(`   ${item.file}:${item.link.line} - "${item.link.text}" -> ${item.link.url}`);
                console.log(`     Error: ${item.error}`);
            }
        }

        // Show skipped external links
        if (this.results.external.skipped.length > 0) {
            console.log(`\n⏭️ SKIPPED EXTERNAL LINKS:`);
            for (const item of this.results.external.skipped) {
                console.log(`   ${item.file}:${item.link.line} - "${item.link.text}" -> ${item.link.url}`);
                console.log(`     Reason: ${item.reason}`);
            }
        }

        const hasErrors = this.results.internal.broken.length > 0 ||
                         this.results.anchor.broken.length > 0 ||
                         this.results.asset.broken.length > 0 ||
                         this.results.external.broken.length > 0;

        if (!hasErrors) {
            console.log('\n🎉 All checked links are valid!');
        }

        console.log('\n' + '='.repeat(50));
    }
}

// Run link checking if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const checkExternal = !process.argv.includes('--no-external');

    const checker = new LinkChecker();
    checker.checkLinks(checkExternal).then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Link checking failed:', error);
        process.exit(1);
    });
}

export { LinkChecker };