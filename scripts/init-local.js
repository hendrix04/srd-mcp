import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('Initializing local settings for the srd-mcp repository...');

const discoveryCmd = `node --experimental-strip-types "${path.join(projectRoot, 'agent', 'discovery.ts').replace(/\\/g, '/')}"`;
const callCmd = `node --experimental-strip-types "${path.join(projectRoot, 'agent', 'tool-caller.ts').replace(/\\/g, '/')}"`;

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
console.log('\nAbsolute paths resolved:\n');
console.log(`discoveryCommand: ${settings.tools.discoveryCommand}`);
console.log(`callCommand: ${settings.tools.callCommand}`);
