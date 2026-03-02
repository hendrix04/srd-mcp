import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Get the target directory from command line arguments
const targetArg = process.argv[2];

if (!targetArg) {
  console.error('Error: Please provide a target project directory.');
  console.error('Usage: node scripts/install-to.js <path/to/target/project>');
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), targetArg);

if (!fs.existsSync(targetDir)) {
  console.error(`Error: Target directory does not exist: ${targetDir}`);
  process.exit(1);
}

console.log(`Installing srd-consultant to: ${targetDir}`);

// 1. Ensure target .gemini/agents directory exists
const targetGeminiDir = path.join(targetDir, '.gemini');
const targetAgentsDir = path.join(targetGeminiDir, 'agents');

// if there was a previous install, remove its agent file and reset settings
const previousAgentFile = path.join(targetAgentsDir, 'srd-consultant.md');
if (fs.existsSync(previousAgentFile)) {
  console.log(`Removing previous agent file at ${previousAgentFile}`);
  fs.unlinkSync(previousAgentFile);
}

if (!fs.existsSync(targetGeminiDir)) {
  fs.mkdirSync(targetGeminiDir, { recursive: true });
}
if (!fs.existsSync(targetAgentsDir)) {
  fs.mkdirSync(targetAgentsDir, { recursive: true });
}

// 2. Copy the agent definition file
const sourceAgentFile = path.join(projectRoot, '.gemini', 'agents', 'srd-consultant.md');
const targetAgentFile = path.join(targetAgentsDir, 'srd-consultant.md');

if (!fs.existsSync(sourceAgentFile)) {
  console.error(`Error: Source agent file not found: ${sourceAgentFile}`);
  process.exit(1);
}

fs.copyFileSync(sourceAgentFile, targetAgentFile);
console.log(`✓ Copied agent definition to ${targetAgentFile}`);

// 3. Update or create .gemini/settings.json in the target project
const discoveryCmd = `node --experimental-strip-types ${path.join(projectRoot, 'agent', 'discovery.ts').replace(/\\/g, '/')}`;
const callCmd = `node --experimental-strip-types ${path.join(projectRoot, 'agent', 'tool-caller.ts').replace(/\\/g, '/')}`;

const targetSettingsFile = path.join(targetGeminiDir, 'settings.json');
let settings = {};

// if settings exist we will overwrite srd-specific fields to avoid leftover values
if (fs.existsSync(targetSettingsFile)) {
  try {
    const settingsContent = fs.readFileSync(targetSettingsFile, 'utf-8');
    settings = JSON.parse(settingsContent);
    // clear previous srd tool entries
    if (settings.tools && (settings.tools.discoveryCommand || settings.tools.callCommand)) {
      delete settings.tools.discoveryCommand;
      delete settings.tools.callCommand;
    }
  } catch (err) {
    console.error(`Error reading existing settings.json: ${err.message}`);
    console.log('Replacing with new settings object.');
    settings = {};
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

fs.writeFileSync(targetSettingsFile, JSON.stringify(settings, null, 2), 'utf-8');
console.log(`✓ Updated settings in ${targetSettingsFile}`);

// quick sanity check of the discovery command in the context of the CLI project
const test = spawnSync(discoveryCmd, { shell: true, encoding: 'utf-8' });
if (test.error || test.status !== 0) {
    console.warn(`Warning: discovery command failed when tested. stderr:\n${test.stderr}`);
} else {
    try {
        JSON.parse(test.stdout);
    } catch (err) {
        console.warn('Warning: discovery command output was not valid JSON during install.');
    }
}

console.log('\nInstallation complete!');
console.log('You can now use the `srd-consultant` sub-agent in your target project.');
