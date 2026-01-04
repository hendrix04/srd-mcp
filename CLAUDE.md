# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides access to the Dungeons & Dragons 5th Edition System Reference Document (SRD 5.2.1). The server exposes D&D rules, spells, monsters, items, and other game content through MCP tools designed to support character and campaign manager applications.

## Architecture

The project follows a **pragmatic balanced architecture**:

### Technology Stack
- **Runtime**: Deno (TypeScript without npm/build tools)
- **Protocol**: MCP via official `@modelcontextprotocol/sdk`
- **Data Strategy**: Pre-processed markdown → JSON with in-memory caching

### Directory Structure

```
srd-mcp/
├── src/                           # MCP server implementation
│   ├── server.ts                  # Entry point - initializes services and MCP server
│   ├── data/
│   │   └── data-loader.ts         # JSON loader with in-memory caching
│   ├── services/                  # Business logic layer
│   │   ├── spell-service.ts       # Spell filtering, search, lookup
│   │   ├── class-service.ts       # Class data with level-aware filtering
│   │   ├── race-service.ts        # Race/species data access
│   │   └── rules-service.ts       # Combat rules lookup
│   ├── tools/
│   │   └── registry.ts            # All 8 MCP tool definitions and handlers
│   ├── types/                     # TypeScript interfaces (fully typed)
│   │   ├── spell-types.ts
│   │   ├── class-types.ts
│   │   ├── race-types.ts
│   │   ├── rule-types.ts
│   │   └── common-types.ts
│   └── utils/
│       ├── fuzzy-search.ts        # Simple fuzzy string matching
│       └── validators.ts          # Input validation (currently unused)
├── scripts/                       # Preprocessing pipeline
│   ├── preprocess.ts              # Main orchestrator
│   ├── parsers/                   # Markdown → JSON parsers
│   │   ├── spell-parser.ts        # ✅ Working (198 spells parsed)
│   │   ├── class-parser.ts        # ⚠️ Needs work (only 2/12 classes parsed)
│   │   ├── race-parser.ts         # ✅ Working (13 races parsed)
│   │   └── rules-parser.ts        # ✅ Working (combat rules parsed)
│   └── utils/
│       └── markdown-utils.ts      # Markdown parsing utilities
├── data/                          # Generated JSON files (gitignored)
│   ├── spells/
│   │   ├── spells-by-name.json    # All spells indexed by name
│   │   └── spells-by-class.json   # Class → level → spell names index
│   ├── classes/                   # Individual class JSON files
│   ├── races/                     # Individual race JSON files
│   └── rules/
│       └── combat-rules.json      # Actions, conditions, cover rules
└── srd_reference/                 # Original SRD markdown (unchanged)
    ├── DnD5eSRD_md/               # 20 markdown files (364 pages)
    ├── srd_index/                 # Hierarchical index
    └── srd_glossary.md            # Quick reference
```

## Current Status

### ✅ Completed
- **MCP Server**: Fully functional with 8 tools
- **Spell System**: 198 spells parsed and searchable
- **Race System**: 13 races with traits
- **Combat Rules**: Actions, conditions, and cover rules
- **Services Layer**: Clean separation of concerns
- **Type Safety**: Comprehensive TypeScript interfaces
- **Documentation**: README with tool examples

### ⚠️ Known Issues / TODO

#### High Priority
1. **Class Parser Incomplete** (scripts/parsers/class-parser.ts)
   - Currently only parses 2/12 classes (Barbarian, Bard)
   - The parser can't find sections for: Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard
   - **Root Cause**: The class sections may be marked with different header levels or naming patterns in the markdown
   - **Fix Needed**: Update `extractSections()` calls and section matching logic to find all 12 classes
   - **Location**: Lines 36-43 in class-parser.ts

2. **Error Handling in Data Loader** (src/data/data-loader.ts)
   - Core methods (`loadSpellsByName`, `loadSpellsByClass`, `loadCombatRules`) don't have try-catch blocks
   - **Impact**: Missing/corrupted JSON files will crash the server
   - **Fix Needed**: Add error handling with informative messages about running preprocessing
   - **Locations**: Lines 21-29, 34-42, 149-157

3. **Path Construction Not Cross-Platform** (src/data/data-loader.ts)
   - Uses string concatenation with `/` instead of `std/path`
   - **Fix Needed**: Import and use `join()` from `https://deno.land/std/path/mod.ts`
   - **Locations**: All path construction throughout the file

#### Medium Priority
4. **Input Validation Not Used** (src/tools/registry.ts)
   - `validators.ts` exists but tools use unsafe `as` type assertions
   - **Fix Needed**: Use `validateSpellFilters()` and similar functions before service calls
   - **Location**: Line 163 and other tool handlers

5. **Feature Extraction in Class Parser** (scripts/parsers/class-parser.ts)
   - `parseFeatures()` function is simplified (line 123-142)
   - Features don't have accurate level assignments
   - **Fix Needed**: Parse level information from feature context or level tables

#### Low Priority
6. **Additional Content Types Not Implemented**
   - Backgrounds (4 in SRD)
   - Feats (~45 in SRD)
   - Equipment (~160 items)
   - Magic Items (~330 items)
   - Monsters (~450 creatures)
   - **Note**: Index files exist in `srd_reference/srd_index/` for all these categories

## Development Workflows

### Running the Server
```bash
# Development mode (auto-reload)
deno task dev

# Production mode
deno task start
```

### Preprocessing SRD Data
```bash
# Run all parsers
deno task preprocess

# The script will output:
# - How many items were parsed from each category
# - Any warnings about missing sections
# - Generated files in data/ directory
```

### Adding New Tools

1. **Define the tool** in `src/tools/registry.ts`:
   - Add to the `tools` array in `ListToolsRequestSchema` handler
   - Add handler case in `CallToolRequestSchema` handler

2. **Implement service method** in appropriate service file:
   - Keep business logic in services, not in tool handlers
   - Use DataLoader for data access

3. **Add TypeScript types** if needed:
   - Define interfaces in `src/types/`
   - Export from appropriate type file

### Adding New Content Types

1. **Create parser** in `scripts/parsers/`:
   - Follow pattern of existing parsers
   - Use `markdown-utils.ts` helpers
   - Export a main parsing function

2. **Add to preprocessing**:
   - Import parser in `scripts/preprocess.ts`
   - Add parsing step in `main()` function
   - Create output directory

3. **Create service**:
   - Add service in `src/services/`
   - Use DataLoader pattern for caching

4. **Register tools**:
   - Add tool definitions in `src/tools/registry.ts`
   - Wire to service methods

## Data Structures

### SRD Content Organization

The SRD content is organized in `srd_reference/` with two parallel structures:

#### Raw SRD Files
- `DnD5eSRD_md/` - Complete SRD in 20 markdown files
- Each file contains ~16-20 pages of the original 364-page SRD
- Files are named by page ranges (e.g., `DND5eSRD_104-120.md`)

#### Indexed Structure
- `srd_index/` - Hierarchical index system
- `index.md` - Master index (~1,900 indexed terms)
- Category indexes with alphabetically split subdirectories for large categories
- Each index entry includes: Term, Category, Source File, Location (line number)

#### Quick Reference
- `srd_glossary.md` - O(1) lookup for common game terms

### Preprocessed JSON Schemas

#### Spells (Two-File Strategy)
**spells-by-name.json** - Source of truth:
```typescript
{
  "Spell Name": {
    name: string,
    level: 0-9,
    school: MagicSchool,
    classes: string[],
    castingTime: string,
    range: string,
    components: { V: boolean, S: boolean, M: string | null },
    duration: string,
    concentration: boolean,
    ritual: boolean,
    description: string,
    higherLevels?: string,
    cantrip?: string,
    source: { file: string, line: number }
  }
}
```

**spells-by-class.json** - Fast filtering index:
```typescript
{
  "ClassName": {
    "0": ["Cantrip1", "Cantrip2"],
    "1": ["Spell1", "Spell2"],
    // ... levels 0-9
  }
}
```

#### Classes (Individual Files)
**barbarian.json** example:
```typescript
{
  name: string,
  primaryAbility: AbilityScore | AbilityScore[],
  hitDie: string,
  savingThrows: AbilityScore[],
  skillChoices: { count: number, options: Skill[] },
  armorProficiencies: ArmorType[],
  weaponProficiencies: WeaponProficiency[],
  startingEquipment: EquipmentOption[],
  levels: {
    "1": { proficiencyBonus: number, features: string[], ...classSpecific },
    "2": { ... },
    // ... up to level 20
  },
  features: {
    "FeatureName": { level: number, name: string, description: string }
  },
  subclasses?: { ... },
  source: { file: string, line: number }
}
```

## Important Implementation Details

### Case-Insensitive Lookups
The spell service implements case-insensitive lookups (lines 74-90 in spell-service.ts):
- First tries exact match for performance
- Falls back to case-insensitive search
- This handles queries like "fireball" or "Fireball"

### Caching Strategy
DataLoader implements in-memory caching:
- First access reads from disk and caches
- Subsequent calls return cached data
- Cache persists for server lifetime
- Clear with `clearCache()` if needed

### Level-Aware Filtering
Classes support filtering by character level:
- Pass `level` parameter to `getClassDetails()`
- Returns only features/progression up to that level
- O(1) lookup via levels object structure

### Fuzzy Search
Simple fuzzy matching in `fuzzy-search.ts`:
- Exact match: score 1.0
- Starts with: score 0.9
- Contains: score 0.7
- Character-by-character: score 0.3-0.5
- Used for spell search to handle typos/partial names

## Testing

Currently no automated tests. To test:

1. **Start the server**: `deno task start`
2. **Use MCP inspector** or integrate with MCP client
3. **Test each tool** with sample inputs
4. **Verify responses** are structured JSON

Example test cases:
- `list_spells` with filters: `{ className: "Wizard", level: 3 }`
- `get_spell_details`: `{ name: "fireball" }` (case-insensitive)
- `search_spells`: `{ query: "fire", limit: 5 }`
- `get_class_details`: `{ className: "Barbarian", level: 5 }`

## Legal & Attribution

All SRD content is licensed under Creative Commons Attribution 4.0 International (CC-BY-4.0) by Wizards of the Coast LLC. Any use must include the attribution statement found in `DnD5eSRD_md/DND5eSRD_001-018.md`.

## Performance Characteristics

- **Initial data load**: <500ms
- **Query response**: <50ms (cached)
- **Memory footprint**: ~5-10MB (all data cached)
- **Search performance**: O(n) for ~400 spells (acceptable)

## Extension for Homebrew Content

The architecture supports future homebrew content via JSON overlay:

1. Create homebrew JSON files in `data/extensions/` (future)
2. Use same schema as SRD data
3. DataLoader can merge by ID (homebrew overrides SRD)
4. No code changes needed - just add JSON files

This feature is designed but not yet implemented.
