# Documentation Validation System

Automated validation pipeline to maintain the quality achieved by the hive mind optimization work.

## Overview

This system ensures documentation follows progressive disclosure principles and maintains the high standards established during the hive mind collective intelligence optimization.

## Quick Start

```bash
# Run all documentation validation
npm run docs:full

# Individual validations
npm run docs:validate    # Structure and content validation
npm run docs:test        # Test all code examples
npm run docs:links       # Check all links (including external)
npm run docs:structure   # Progressive disclosure compliance
```

## Validation Components

### 1. Structure Validation (`validate-docs.js`)
- **Progressive disclosure compliance** - Enforces length limits from hive mind optimization
- **Content hierarchy** - Validates heading structure and organization
- **Required sections** - Ensures documentation contains essential elements
- **Content freshness** - Identifies outdated patterns and references

**Standards Applied:**
- README.md: ≤100 lines (optimized from 395 to 81 lines)
- Examples: ≤150 lines (focused demonstrations)
- Documentation: ≤200 lines (reference material)

### 2. Link Validation (`check-links.js`)
- **Internal links** - Validates all relative paths and references
- **External links** - Checks HTTP/HTTPS URLs (with timeout and retry)
- **Anchor links** - Verifies section references within documents
- **Asset links** - Confirms images and files exist

**Features:**
- Caching for performance
- Domain filtering for problematic sites
- Detailed reporting with line numbers

### 3. Code Example Testing (`test-examples.js`)
- **JSON validation** - Ensures configuration examples are valid
- **Shell command safety** - Tests safe commands, skips dangerous ones
- **Syntax checking** - Validates JavaScript/TypeScript code blocks
- **Import validation** - Checks that referenced files exist

**Safety Features:**
- Sandboxed execution environment
- Dangerous command detection
- Interactive command skipping

### 4. Progressive Disclosure Compliance (`check-structure.js`)
- **Length enforcement** - Maintains hive mind optimization standards
- **Hierarchy validation** - Ensures proper heading levels
- **Content organization** - Checks for good structure patterns
- **Duplication detection** - Identifies similar content across files

## GitHub Actions Integration

### Workflow Triggers
- **Push/PR** - Validates changed documentation
- **Weekly schedule** - Checks external link health
- **Manual dispatch** - On-demand validation with options

### Validation Jobs
1. **Quick Validation** - Fast feedback for basic issues
2. **Comprehensive Validation** - Full code example testing
3. **External Link Validation** - Separate job for reliability
4. **Markdown Linting** - Format consistency
5. **Progressive Disclosure Audit** - Detailed compliance checking

## Pre-commit Hooks

Automatic validation before commits:
- Length limit enforcement
- Basic markdown linting
- Internal link checking
- JSON validation

**Setup:**
```bash
npm install
npx husky install
```

## Usage Examples

### Local Development
```bash
# Before committing documentation changes
npm run docs:validate

# Test specific aspects
npm run docs:links:internal  # Skip external links for speed
npm run docs:structure       # Check progressive disclosure only
```

### CI/CD Integration
```bash
# In GitHub Actions or other CI
npm run docs:full

# Performance-focused (no external links)
npm run docs:validate && npm run docs:test
```

### Troubleshooting

**Common Issues:**

1. **Length Violations**
   ```
   ERROR: README.md exceeds progressive disclosure limit (120 > 100 lines)
   ```
   **Solution:** Break content into focused sections or move details to `examples/`

2. **Broken Internal Links**
   ```
   ERROR: Broken internal link: "docs/missing-file.md"
   ```
   **Solution:** Update the link path or create the missing file

3. **Invalid Code Examples**
   ```
   ERROR: Invalid JSON in code block 3: Unexpected token
   ```
   **Solution:** Fix the JSON syntax in the code block

### Configuration

#### Length Limits
Modify `scripts/docs/validate-docs.js`:
```javascript
this.lengthLimits = {
    'README.md': 100,        // Critical limit
    'examples/**/*.md': 150,  // Recommended limit
    'docs/**/*.md': 200,      // Documentation limit
    '*.md': 300              // Default limit
};
```

#### Progressive Patterns
Update required sections in `scripts/docs/check-structure.js`:
```javascript
progressivePatterns: {
    'README.md': {
        requiredSections: ['Quick Start', 'Installation', 'Usage'],
        maxDetailLevel: 2,
        shouldReference: ['examples/', 'docs/']
    }
}
```

## Maintenance

### Weekly Tasks
- Review external link failures
- Update validation rules if needed
- Check for new documentation patterns

### Monthly Tasks
- Audit progressive disclosure compliance
- Update length limits if content grows
- Review and update validation scripts

## Integration with Development Workflow

### For Contributors
1. Write documentation following progressive disclosure
2. Test examples work before committing
3. Use internal links for cross-references
4. Keep files focused and concise

### For Maintainers
1. Monitor validation reports
2. Update standards as project evolves
3. Add new validation rules for emerging patterns
4. Maintain CI/CD pipeline health

## Success Metrics

- **100% internal link validity** - No broken project references
- **Progressive disclosure compliance** - All files within limits
- **Working examples** - All code blocks execute correctly
- **Fresh content** - Regular updates and reviews

This system ensures the documentation quality achieved by the hive mind optimization work remains intact and continues to improve.