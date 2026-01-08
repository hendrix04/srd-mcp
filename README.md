# D&D 5e SRD MCP Server

A Model Context Protocol (MCP) server that provides access to the Dungeons & Dragons 5th Edition System Reference Document (SRD 5.2.1). This server exposes D&D rules, spells, classes, species, backgrounds, feats, and game mechanics through MCP tools for use with AI assistants building character and campaign managers.

## Features

- **Spell Tools**: Search, filter, and retrieve detailed spell information
- **Class Tools**: Access character class information with level-aware filtering
- **Species Tools**: Character ancestry information (formerly "race")
- **Background Tools**: Character background data including skills and features
- **Feat Tools**: Character feat information with filtering by category
- **Rules Tools**: Comprehensive reference for game rules and mechanics

## Quick Start

### Prerequisites

- [Deno](https://deno.land/) v1.37 or higher

### Setup

1. Clone this repository
2. Generate the preprocessed JSON data:

```bash
deno task preprocess
```

3. Start the MCP server:

```bash
deno task start
```

The server will run on stdio and can be integrated with any MCP client.

## IDE Integration

### Claude Desktop / Claude Code

Add to your Claude configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dnd-srd": {
      "command": "deno",
      "args": ["run", "--allow-read", "/absolute/path/to/srd-mcp/src/server.ts"]
    }
  }
}
```

Replace `/absolute/path/to/srd-mcp/` with the actual path to this repository.

### VS Code (with Continue extension)

Add to `.continue/config.json` in your workspace:

```json
{
  "mcpServers": [
    {
      "name": "dnd-srd",
      "command": "deno",
      "args": ["run", "--allow-read", "/absolute/path/to/srd-mcp/src/server.ts"]
    }
  ]
}
```

### Zed Editor

Add to your Zed settings (`~/.config/zed/settings.json` on Linux/macOS or `%APPDATA%\Zed\settings.json` on Windows):

```json
{
  "context_servers": {
    "dnd-srd": {
      "command": "deno",
      "args": ["run", "--allow-read", "/absolute/path/to/srd-mcp/src/server.ts"]
    }
  }
}
```

### Cline (VS Code extension)

Add to your Cline MCP settings file:

```json
{
  "mcpServers": {
    "dnd-srd": {
      "command": "deno",
      "args": ["run", "--allow-read", "/absolute/path/to/srd-mcp/src/server.ts"]
    }
  }
}
```

**Note**: After adding the server configuration, restart your IDE/editor for the changes to take effect.

## Usage Examples

Once integrated with your IDE, you can ask your AI assistant questions like:

- "Show me all wizard spells that are level 3 or lower"
- "What are the traits of a Dragonborn?"
- "List all feats that can be taken multiple times"
- "What does the grappled condition do?"
- "Give me details on the Barbarian class up to level 5"
- "Search for spells with 'fire' in the name"
- "What backgrounds give proficiency in Stealth?"

The AI assistant will use the appropriate MCP tools to retrieve accurate information from the SRD.

## Available MCP Tools

### Spell Tools

**`list_spells`** - List spells with optional filters
- `className` (optional): e.g., "Wizard", "Cleric"
- `level` (optional): 0-9
- `school` (optional): e.g., "Evocation", "Abjuration"

**`get_spell_details`** - Get complete spell information (case-insensitive)
- `name` (required): e.g., "Fireball", "fireball"

**`search_spells`** - Fuzzy search by spell name
- `query` (required): Search term
- `limit` (optional): Max results (default: 10, max: 50)

### Class Tools

**`list_classes`** - List all available classes

**`get_class_details`** - Get class information
- `className` (required): e.g., "Barbarian", "Wizard"
- `level` (optional): 1-20 (filters to show only features up to this level)

### Species Tools

**`list_species`** - List all available species

**`get_species_details`** - Get species information (case-insensitive)
- `speciesName` (required): e.g., "Human", "Elf", "Dwarf"

### Background Tools

**`list_backgrounds`** - List all available backgrounds

**`get_background_details`** - Get background information (case-insensitive)
- `backgroundName` (required): e.g., "Acolyte", "Criminal"

### Feat Tools

**`list_feats`** - List feats with optional filters
- `category` (optional): e.g., "General", "Origin"
- `repeatable` (optional): true/false

**`get_feat_details`** - Get feat information (case-insensitive)
- `featName` (required): e.g., "Grappler", "Alert"

### Rules Tools

**`get_combat_rule`** - Look up game rules
- `topic` (required): e.g., "grappled", "attack", "cover", "dodge", "strength", "lawful good"

## Current Status

### Parsed Data
- ✅ **339 spells** - All cantrips and spells (levels 0-9) with full details
- ✅ **12 classes** - All core classes with features and progression
  - Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard
- ✅ **9 species** - Character ancestries with traits and variants
  - Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling
- ✅ **4 backgrounds** - Character backgrounds with skills and features
  - Acolyte, Criminal, Sage, Soldier
- ✅ **17 feats** - Character feats with prerequisites and effects
- ✅ **Comprehensive game rules** - Actions, conditions, cover, ability scores, alignments, languages, resting, currency, and more

### Features
- ✅ Input validation on all tool boundaries
- ✅ Case-insensitive lookups for all data types
- ✅ Integration tests covering all services (20 tests, 100% passing)
- ✅ Cross-platform path handling (Windows, macOS, Linux)
- ✅ Fuzzy search for spells
- ✅ Level-aware class filtering

### Known Limitations
- Equipment, magic items, and monsters not yet exposed (data exists in SRD but not yet parsed)
- See `CLAUDE.md` for detailed architecture and development information

## Architecture

This project uses a **pragmatic balanced architecture**:

- **Preprocessing**: One-time markdown → JSON transformation
- **Services Layer**: Business logic for filtering, searching, and data access
- **Data Loader**: In-memory caching for performance
- **MCP Tools**: Thin layer translating MCP requests to service calls

### Key Design Decisions

1. **Two-file spell strategy**: Optimizes both name lookup and class filtering
2. **Level-aware class data**: O(1) lookup for specific character levels
3. **Case-insensitive search**: All lookup services handle queries like "fireball" or "Fireball"
4. **Simple fuzzy search**: Lightweight string matching without dependencies
5. **Input validation**: All tools validate parameters before processing
6. **Cross-platform paths**: Uses Deno std/path for Windows/Unix compatibility
7. **Error handling**: Informative error messages guide users to run preprocessing

## Performance

- **Data load**: <500ms on first access
- **Query response**: <50ms (cached)
- **Memory footprint**: ~5-10MB

## Development

See `CLAUDE.md` for:
- Detailed architecture documentation
- Known issues and TODO list with specific locations
- Development workflows
- How to add new tools or content types
- Data structure schemas

## Legal & Attribution

All SRD content is licensed under Creative Commons Attribution 4.0 International (CC-BY-4.0) by Wizards of the Coast LLC.

**Attribution:**
> This work includes material taken from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC and is available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

## License

MIT License - See LICENSE file for details.

The D&D 5e SRD content is licensed separately under CC-BY-4.0 by Wizards of the Coast.
