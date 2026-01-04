# D&D 5E SRD Index

This directory contains a hierarchical index of the D&D 5E System Reference Document (SRD) for efficient agent access.

## Structure

### Master Index
- [`index.md`](index.md) - Top-level index with links to all category indexes

### Category Indexes

#### Core Rules
- [`core_rules.md`](core_rules.md) - Playing the Game, Combat mechanics

#### Character Building
- [`character_creation.md`](character_creation.md) - Character creation rules and origins
- [`classes.md`](classes.md) - All classes and subclasses
- [`feats.md`](feats.md) - All feats

#### Equipment & Items
- [`equipment.md`](equipment.md) - Weapons, armor, adventuring gear
- [`magic_items/`](magic_items/) - Magic items split alphabetically (A-E, F-J, K-O, P-T, U-Z)

#### Spells
- [`spells/`](spells/) - Spells split  alphabetically (A-C, D-F, G-L, M-P, Q-S, T-Z)

#### Monsters
- [`monsters/`](monsters/) - Monsters split alphabetically (A-D, E-J, K-P, Q-Z)

## Usage

For agents: Start with `index.md` to navigate to the relevant category, then drill down to specific indexes as needed.

For scripts: Use `generate_srd_index.py` to regenerate all indexes from source SRD files.
