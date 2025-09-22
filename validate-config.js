#!/usr/bin/env node

/**
 * MCP Configuration Validator
 * Validates MCP configuration files against the JSON schema
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

// Load schema and configuration
const schemaPath = path.join(__dirname, 'mcp-config-schema.json');
const configPath = process.argv[2] || path.join(__dirname, '.vscode', 'mcp.json');

console.log('🔍 MCP Configuration Validator');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Check if schema exists
if (!fs.existsSync(schemaPath)) {
  console.error('❌ Schema file not found:', schemaPath);
  process.exit(1);
}

// Check if config exists
if (!fs.existsSync(configPath)) {
  console.error('❌ Configuration file not found:', configPath);
  console.log('');
  console.log('Usage:');
  console.log('  node validate-config.js [path-to-config.json]');
  console.log('');
  console.log('Examples:');
  console.log('  node validate-config.js .vscode/mcp.json');
  console.log('  node validate-config.js ~/.config/Code/User/mcp.json');
  process.exit(1);
}

try {
  // Load schema and config
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Initialize AJV validator
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  console.log('📁 Validating:', configPath);
  console.log('📋 Schema version:', schema.$id || 'local');
  console.log('');

  // Validate configuration
  const valid = validate(config);

  if (valid) {
    console.log('✅ Configuration is valid!');
    console.log('');

    // Show configuration summary
    console.log('📊 Configuration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`MCP Version: ${config.mcpVersion || 'not specified'}`);
    console.log(`Servers: ${Object.keys(config.servers || {}).length}`);

    // List each server
    Object.entries(config.servers || {}).forEach(([name, server]) => {
      console.log(`  • ${name}:`);
      console.log(`    Command: ${server.command}`);
      if (server.args) {
        console.log(`    Args: ${server.args.join(' ')}`);
      }
      if (server.env) {
        console.log(`    Environment: ${Object.keys(server.env).length} variables`);
      }
    });

  } else {
    console.log('❌ Configuration validation failed!');
    console.log('');
    console.log('Errors:');
    validate.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.instancePath || '/'}: ${error.message}`);
      if (error.allowedValues) {
        console.log(`     Allowed values: ${error.allowedValues.join(', ')}`);
      }
    });
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error processing files:');
  console.error('  ', error.message);
  process.exit(1);
}

console.log('');
console.log('🎉 Validation complete!');