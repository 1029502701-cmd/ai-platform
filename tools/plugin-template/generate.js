#!/usr/bin/env node
/**
 * Plugin Template Generator
 * 
 * Usage: npm create plugin <plugin-name>
 *        yarn create plugin <plugin-name>
 *        npx create-plugin <plugin-name>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getPackageName(name) {
  // Convert to valid package name (kebab-case, lowercase)
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function getAuthorName() {
  try {
    return execSync('git config --global user.name', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return 'Developer';
  }
}

function getAuthorEmail() {
  try {
    return execSync('git config --global user.email', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return 'developer@example.com';
  }
}

function createPluginTemplate(pluginName, outputDir) {
  const pkgName = getPackageName(pluginName);
  const authorName = getAuthorName();
  const authorEmail = getAuthorEmail();
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const files = [
    {
      file: 'manifest.json',
      content: JSON.stringify({
        id: pkgName,
        name: pluginName,
        version: '0.1.0',
        description: ${pluginName} plugin,
        routes: [],
        permissions: [],
        author: { name: authorName, email: authorEmail },
      }, null, 2),
    },
    {
      file: 'index.ts',
      content: import { PluginContext, PluginSDKManifest } from '@platform/plugin-sdk';\n\n/**\n * Main plugin entry point.\n */\nexport const manifest: PluginSDKManifest = {\n  id: '',\n  name: '',\n  version: '0.1.0',\n  description: ' plugin',\n  author: { name: '', email: '' },\n  category: 'tool',\n  permissions: [],\n  events: [],\n  metrics: [],\n  dependencies: {},\n};\n\n/**\n * Initialize the plugin with the given context.\n */\nexport function initialize(context: PluginContext) {\n  context.logger.info('Plugin  initialized');\n}\n,
    },
    {
      file: 'README.md',
      content: # \n\n is a platform plugin that provides AI-powered capabilities.\n\n## Installation\n\n`\nnpm install @platform/plugin-sdk\n`\n\n## Development\n\nInstall dev dependencies:\n`\nnpm install -D typescript @types/node\n`\n\nBuild:\n`\npm run build\n`\n\n## License\n\nMIT License\n,
    },
    {
      file: 'services/builder.ts',
      content: /**\n * Service layer for  plugin.\n */\nexport class Service {\n  constructor(private context: PluginContext) {}\n\n  async initialize(): Promise<void> {\n    this.context.logger.info('Service initialized');\n  }\n},
    },
    {
      file: 'routes/handlers.ts',
      content: /**\n * Route handlers for  plugin.\n */\nimport { Request, Response } from 'express';\n\nexport const healthCheck = (req: Request, res: Response) => {\n  res.status(200).json({ status: 'healthy', plugin: '' });\n};\n,
    },
  ];
  
  // Create root files
  files.forEach(({ file, content }) => {
    const filePath = path.join(outputDir, file);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(Created: );
  });
  
  // Create subdirectories
  ['services', 'routes', 'events'].forEach(dir => {
    const dirPath = path.join(outputDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(Created: /);
    }
  });
  
  // Create empty events file if not present
  const eventsFile = path.join(outputDir, 'events', 'index.ts');
  if (!fs.existsSync(eventsFile)) {
    fs.writeFileSync(eventsFile, '/** Event handlers for plugin */\n', 'utf-8');
    console.log('Created: events/index.ts');
  }
  
  console.log(\nPlugin template created successfully at: );
  console.log(Package name: );
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: plugin name required');
  console.log('Usage: npm create plugin <plugin-name>');
  process.exit(1);
}

const pluginName = args[0];
const outputDir = path.join(process.cwd(), pluginName);

createPluginTemplate(pluginName, outputDir);
