# D&D 5e SRD MCP Server

A Model Context Protocol (MCP) server that provides access to the Dungeons & Dragons 5th Edition System Reference Document (SRD 5.2.1). This server exposes D&D rules, spells, classes, races, and combat rules through MCP tools for use with AI assistants building character and campaign managers.

## Features

- **Spell Tools**: Search, filter, and retrieve detailed spell information
- **Class Tools**: Access character class information with level-aware filtering
- **Race/Species Tools**: Character ancestry information
- **Combat Rules**: Quick reference for combat mechanics

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

### Race Tools

**`list_races`** - List all available races/species

**`get_race_details`** - Get race information
- `raceName` (required): e.g., "Human", "Elf", "Dwarf"

### Rules Tools

**`get_combat_rule`** - Look up combat rules
- `topic` (required): e.g., "grappled", "attack", "cover", "dodge"

## Current Status

### Working
- ✅ 198 spells parsed and searchable
- ✅ 13 races with traits
- ✅ Combat rules (actions, conditions, cover)
- ✅ 2 classes (Barbarian, Bard)

### Known Limitations
- Class parser needs refinement (only 2/12 classes currently parsed)
- See `CLAUDE.md` for detailed TODO list and known issues

## Architecture

This project uses a **pragmatic balanced architecture**:

- **Preprocessing**: One-time markdown → JSON transformation
- **Services Layer**: Business logic for filtering, searching, and data access
- **Data Loader**: In-memory caching for performance
- **MCP Tools**: Thin layer translating MCP requests to service calls

### Key Design Decisions

1. **Two-file spell strategy**: Optimizes both name lookup and class filtering
2. **Level-aware class data**: O(1) lookup for specific character levels
3. **Case-insensitive search**: Handles queries like "fireball" or "Fireball"
4. **Simple fuzzy search**: Lightweight string matching without dependencies

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
