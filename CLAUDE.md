# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides access to the Dungeons & Dragons 5th Edition System Reference Document (SRD 5.2.1). The server will expose D&D rules, spells, monsters, items, and other game content through MCP tools.

## SRD Data Structure

The SRD content is organized in `srd_reference/` with two parallel structures:

### Raw SRD Files
- `DnD5eSRD_md/` - The complete SRD split into 20 markdown files (DND5eSRD_001-018.md through DND5eSRD_333-364.md)
- Each file contains approximately 16-20 pages of the original 364-page SRD
- These files contain the full text of rules, spell descriptions, monster stat blocks, etc.

### Indexed Structure
- `srd_index/` - Hierarchical index system for efficient lookup
- `index.md` - Master index (~1,900 indexed terms)
- Category indexes: `core_rules.md`, `character_creation.md`, `classes.md`, `feats.md`, `equipment.md`
- Alphabetically split subdirectories:
  - `spells/` - ~400 spells split A-C, D-F, G-L, M-P, Q-S, T-Z
  - `magic_items/` - ~330 items split A-E, F-J, K-O, P-T, U-Z
  - `monsters/` - ~450 creatures split A-D, E-J, K-P, Q-Z

### Quick Reference
- `srd_glossary.md` - O(1) lookup for common game terms (conditions, actions, ability scores, cover, resting, currency, XP)

## Content Access Pattern

When implementing MCP tools to query SRD content:

1. Start with `srd_index/index.md` to identify the relevant category
2. Navigate to the specific category index (e.g., `spells/index.md`)
3. Use alphabetical splits to narrow the search space
4. Reference `srd_glossary.md` for frequently-accessed rules snippets
5. Pull full details from the appropriate `DnD5eSRD_md/` file when needed

## Legal & Attribution

All SRD content is licensed under Creative Commons Attribution 4.0 International (CC-BY-4.0) by Wizards of the Coast LLC. Any use must include the attribution statement found in `DnD5eSRD_md/DND5eSRD_001-018.md`.

## Development Notes

This is a new project - the MCP server implementation has not yet been created. When implementing:
- MCP servers typically use Python or TypeScript
- Tools should leverage the indexed structure for efficient lookups
- Consider implementing tools like: `search_spell`, `lookup_monster`, `get_rule`, `find_item`, etc.
- The glossary is optimized for quick responses to common rule questions
