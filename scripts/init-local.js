import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('Initializing local settings for the srd-mcp repository...');

const discoveryCmd = `node --experimental-strip-types ${path.join(projectRoot, 'agent', 'discovery.ts').replace(/\\/g, '/')}`;
const callCmd = `node --experimental-strip-types ${path.join(projectRoot, 'agent', 'tool-caller.ts').replace(/\\/g, '/')}`;

const settingsFile = path.join(projectRoot, '.gemini', 'settings.json');
let settings = {};

if (fs.existsSync(settingsFile)) {
    try {
        const settingsContent = fs.readFileSync(settingsFile, 'utf-8');
        settings = JSON.parse(settingsContent);
    } catch (err) {
        console.error(`Error reading existing settings.json: ${err.message}`);
    }
}

// Ensure experimental.enableAgents is true
if (!settings.experimental) {
    settings.experimental = {};
}
settings.experimental.enableAgents = true;

// Ensure tools configuration points to this project's absolute paths
if (!settings.tools) {
    settings.tools = {};
}
settings.tools.discoveryCommand = discoveryCmd;
settings.tools.callCommand = callCmd;

fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
console.log(`✓ Updated local settings in ${settingsFile}`);

// verify the discovery command runs and outputs something
const result = spawnSync(settings.tools.discoveryCommand, { shell: true, encoding: 'utf-8' });
if (result.error || result.status !== 0) {
    console.warn('Warning: discovery command failed when tested.');
    if (result.stderr) console.warn(result.stderr);
} else {
    try {
        JSON.parse(result.stdout);
    } catch (err) {
        console.warn('Warning: discovery command output was not valid JSON.');
    }
}

console.log('\nAbsolute paths resolved:\n');
console.log(`discoveryCommand: ${settings.tools.discoveryCommand}`);
console.log(`callCommand: ${settings.tools.callCommand}`);
