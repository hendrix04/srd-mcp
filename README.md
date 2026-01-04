# D&D 5e SRD MCP Server

A Model Context Protocol (MCP) server that provides access to the Dungeons & Dragons 5th Edition System Reference Document (SRD 5.2.1). This server exposes D&D rules, spells, classes, races, and combat rules through MCP tools for use with AI assistants building character and campaign managers.

## Features

- **Spell Tools**: Search, filter, and retrieve detailed spell information
  - Filter by class, level, and school of magic
  - Fuzzy search for finding spells by name
  - Complete spell details including components, duration, and descriptions

- **Class Tools**: Access character class information
  - List all available classes
  - Get detailed class information with level-aware filtering
  - View class features, proficiencies, and progression tables

- **Race/Species Tools**: Character ancestry information
  - List all available races
  - Get detailed racial traits and abilities

- **Combat Rules**: Quick reference for combat mechanics
  - Look up actions, conditions, and combat rules
  - Fast access to frequently-needed game mechanics

## Project Structure

```
srd-mcp/
├── src/
│   ├── server.ts                 # MCP server entry point
│   ├── data/
│   │   └── data-loader.ts        # JSON file loader with caching
│   ├── services/                 # Business logic layer
│   │   ├── spell-service.ts
│   │   ├── class-service.ts
│   │   ├── race-service.ts
│   │   └── rules-service.ts
│   ├── tools/
│   │   └── registry.ts           # MCP tool definitions and handlers
│   ├── types/                    # TypeScript interfaces
│   │   ├── spell-types.ts
│   │   ├── class-types.ts
│   │   ├── race-types.ts
│   │   ├── rule-types.ts
│   │   └── common-types.ts
│   └── utils/
│       ├── fuzzy-search.ts       # Fuzzy string matching
│       └── validators.ts         # Input validation
├── scripts/
│   ├── preprocess.ts             # Main preprocessing script
│   ├── parsers/                  # Markdown → JSON parsers
│   │   ├── spell-parser.ts
│   │   ├── class-parser.ts
│   │   ├── race-parser.ts
│   │   └── rules-parser.ts
│   └── utils/
│       └── markdown-utils.ts     # Markdown parsing utilities
├── data/                         # Generated JSON files (gitignored)
│   ├── spells/
│   │   ├── spells-by-name.json
│   │   └── spells-by-class.json
│   ├── classes/
│   ├── races/
│   └── rules/
└── srd_reference/                # Original SRD markdown files
    ├── DnD5eSRD_md/
    ├── srd_index/
    └── srd_glossary.md
```

## Setup

### Prerequisites

- [Deno](https://deno.land/) installed (v1.37 or higher)

### Installation

1. Clone this repository
2. Run the preprocessing script to generate JSON data:

```bash
deno task preprocess
```

This will parse the SRD markdown files and generate structured JSON data in the `data/` directory.

### Running the Server

Start the MCP server:

```bash
deno task start
```

Or in development mode with auto-reload:

```bash
deno task dev
```

## Available MCP Tools

### Spell Tools

#### `list_spells`
List spells with optional filters.

**Parameters:**
- `className` (optional): Filter by class name (e.g., "Wizard", "Cleric")
- `level` (optional): Filter by spell level (0-9)
- `school` (optional): Filter by magic school (e.g., "Evocation", "Abjuration")

**Example:**
```json
{
  "name": "list_spells",
  "arguments": {
    "className": "Wizard",
    "level": 3
  }
}
```

#### `get_spell_details`
Get complete details for a specific spell.

**Parameters:**
- `name` (required): Spell name (e.g., "Fireball", "Cure Wounds")

**Example:**
```json
{
  "name": "get_spell_details",
  "arguments": {
    "name": "Fireball"
  }
}
```

#### `search_spells`
Search for spells using fuzzy name matching.

**Parameters:**
- `query` (required): Search query (spell name or partial name)
- `limit` (optional): Maximum number of results (default: 10, max: 50)

**Example:**
```json
{
  "name": "search_spells",
  "arguments": {
    "query": "fire",
    "limit": 5
  }
}
```

### Class Tools

#### `list_classes`
List all available D&D classes.

**Example:**
```json
{
  "name": "list_classes",
  "arguments": {}
}
```

#### `get_class_details`
Get complete details for a specific class, optionally filtered by character level.

**Parameters:**
- `className` (required): Class name (e.g., "Barbarian", "Wizard")
- `level` (optional): Character level (1-20). If provided, only shows features/progression up to this level

**Example:**
```json
{
  "name": "get_class_details",
  "arguments": {
    "className": "Barbarian",
    "level": 5
  }
}
```

### Race Tools

#### `list_races`
List all available D&D races/species.

**Example:**
```json
{
  "name": "list_races",
  "arguments": {}
}
```

#### `get_race_details`
Get complete details for a specific race/species.

**Parameters:**
- `raceName` (required): Race name (e.g., "Human", "Elf", "Dwarf")

**Example:**
```json
{
  "name": "get_race_details",
  "arguments": {
    "raceName": "Elf"
  }
}
```

### Rules Tools

#### `get_combat_rule`
Look up a specific combat rule, action, or condition.

**Parameters:**
- `topic` (required): Rule topic (e.g., "grappled", "attack", "cover", "dodge")

**Example:**
```json
{
  "name": "get_combat_rule",
  "arguments": {
    "topic": "grappled"
  }
}
```

## Data Structure

The server uses a preprocessing approach where SRD markdown files are converted to structured JSON during build time:

### Spells
- **spells-by-name.json**: All spells indexed by name (source of truth)
- **spells-by-class.json**: Index mapping classes → levels → spell names (for fast filtering)

### Classes
- Individual JSON files per class (e.g., `barbarian.json`, `wizard.json`)
- Level-aware structure with O(1) lookup for specific levels

### Races
- Individual JSON files per race
- Includes traits, size, speed, and other racial features

### Rules
- **combat-rules.json**: Combat actions, conditions, and rules from the glossary

## Extending with Homebrew Content

The architecture supports future extension with homebrew content via JSON overlay system. To add custom content:

1. Create a homebrew JSON file in `data/extensions/`
2. Use the same schema as the SRD data
3. The data loader can be configured to merge homebrew data with SRD data (override by ID)

## Development

### Running Tests

```bash
deno task test
```

### Type Checking

TypeScript strict mode is enabled. All code is fully typed with comprehensive interfaces in `src/types/`.

### Adding New Tools

1. Define the tool schema in `src/tools/registry.ts` (in the `ListToolsRequestSchema` handler)
2. Add the tool handler in the `CallToolRequestSchema` handler
3. Implement business logic in the appropriate service

## Legal & Attribution

All SRD content is licensed under Creative Commons Attribution 4.0 International (CC-BY-4.0) by Wizards of the Coast LLC.

**Attribution Statement:**
> This work includes material taken from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC and is available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

## Architecture

This project follows a **pragmatic balanced architecture**:

- **Services Layer**: Business logic for filtering, searching, and data access
- **Data Loader**: In-memory caching of JSON files for performance
- **MCP Tools**: Thin layer translating MCP requests to service calls
- **Preprocessing**: One-time markdown → JSON transformation

### Design Decisions

1. **Preprocessing over runtime parsing**: JSON files are generated once, loaded fast
2. **Two-file spell strategy**: Optimizes both lookup-by-name and filter-by-class operations
3. **Level-aware class data**: Classes store level progression in object for O(1) access
4. **Simple fuzzy search**: Lightweight string matching without external dependencies
5. **Flat file structure**: Easy to understand, debug, and extend

## Performance

- **Data load time**: <500ms for all files on first access
- **Query response time**: <50ms (in-memory filtering)
- **Search performance**: O(n) linear scan (acceptable for ~400 spells)
- **Memory footprint**: ~5-10MB for all cached data

## Contributing

Contributions are welcome! Please ensure:
- All code is TypeScript with strict typing
- Services remain focused and single-purpose
- New tools follow existing patterns in `registry.ts`
- Preprocessing changes are tested with `deno task preprocess`

## License

MIT License - See LICENSE file for details.

The D&D 5e SRD content is licensed separately under CC-BY-4.0 by Wizards of the Coast.
