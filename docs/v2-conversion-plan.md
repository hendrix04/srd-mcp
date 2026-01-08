# V2 Parser Conversion Plan

## Overview

This plan completes the migration of all parsers to the V2 pattern (marked.js AST-based parsing) and consolidates rules parsing into a single comprehensive system.

## Current State

| Parser | Status | Action Required |
|--------|--------|-----------------|
| `class-parser-v2.ts` | ✅ Complete | None |
| `species-parser-v2.ts` | ✅ Complete | None |
| `background-parser.ts` | ✅ Complete | None |
| `feat-parser.ts` | ✅ Complete | None |
| `character-rules-parser.ts` | ⚠️ Incomplete | Fix - extract all structured data |
| `spell-parser.ts` | ❌ Old pattern | Convert to V2 |
| `rules-parser.ts` | ❌ Old pattern | Merge into character-rules-parser |
| `race-parser.ts` | ❌ Redundant | Delete (species-parser-v2 replaces it) |

---

## Task 1: Remove race-parser.ts

**Complexity**: Simple  
**Files to modify**:
- Delete: `scripts/parsers/race-parser.ts`
- Edit: `scripts/preprocess.ts` - remove import and call to `parseRaces()`
- Delete: `data/races/` directory (output no longer needed)

**Rationale**: `species-parser-v2.ts` already parses all 13 species/races with the V2 pattern.

---

## Task 2: Fix character-rules-parser.ts

**Complexity**: Medium-Large  
**Problem**: Current output has raw `content` fields with unparsed markdown tables.

### New Type Definitions (`src/types/character-rules-types.ts`)

Add these new interfaces:

```typescript
// Class overview from Step 1
export interface ClassOverview {
  className: string;
  likes: string;
  primaryAbility: string;
  complexity: "Low" | "Average" | "High";
}

// Standard array suggestions by class
export interface StandardArrayByClass {
  className: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

// Hit points by class
export interface HitPointsByClass {
  className: string;
  level1HitPoints: string;  // e.g., "12 + Con. modifier"
  fixedHitPointsPerLevel: string;  // e.g., "7 + Con. modifier"
}

// Alignment
export interface Alignment {
  code: string;  // "LG", "NG", "CG", etc.
  name: string;  // "Lawful Good", etc.
  description: string;
}

// Language
export interface Language {
  name: string;
  roll?: string;  // dice roll to select, e.g., "3-4" for Dwarvish
  notes?: string;  // e.g., "includes Aquan, Auran, Ignan, Terran dialects"
}

// Starting equipment at higher levels
export interface StartingEquipmentByLevel {
  levelRange: string;  // "2-4", "5-10", etc.
  equipmentAndMoney: string;
  magicItems: string;
}

// Trinket
export interface Trinket {
  roll: number;  // 1-100
  description: string;
}

// Gaining a level step
export interface LevelUpStep {
  stepNumber: number;
  title: string;
  description: string;
}

// Updated CharacterCreationStep - remove raw content, add structured data
export interface CharacterCreationStep {
  stepNumber: number;
  title: string;
  description: string;
  // Step-specific structured data (no more raw markdown)
  classOverview?: ClassOverview[];  // Step 1
  abilityScoresByBackground?: Record<string, string[]>;  // Step 2
  standardLanguages?: Language[];  // Step 2
  rareLanguages?: Language[];  // Step 2
  standardArrayByClass?: StandardArrayByClass[];  // Step 3
  alignments?: Alignment[];  // Step 4
  hitPointsByClass?: HitPointsByClass[];  // Step 5
}

// Updated main interface
export interface CharacterRules {
  creationSteps: CharacterCreationStep[];
  abilityScoreGeneration: AbilityScoreGenerationMethod[];
  abilityScoreModifiers: Record<number, number>;
  levelAdvancement: LevelAdvancement[];
  levelUpSteps: LevelUpStep[];  // NEW: Steps for gaining a level
  startingEquipmentByLevel: StartingEquipmentByLevel[];  // NEW
  trinkets: Trinket[];  // NEW: Full 100-item trinket table
  multiclassing: { /* existing structure */ };
  tiersOfPlay: TierOfPlay[];
  // Merged from rules-parser.ts:
  actions: Record<string, string>;
  conditions: Record<string, string>;
  cover: Record<string, string>;
  source: SourceReference;
}
```

### Parser Changes

Update `character-rules-parser.ts` to:

1. **Parse Class Overview table** (Step 1)
   - Extract: className, likes, primaryAbility, complexity
   
2. **Parse Ability Scores and Backgrounds table** (Step 2)
   - Map abilities to recommended backgrounds

3. **Parse Standard/Rare Languages tables** (Step 2)
   - Extract language names with roll ranges

4. **Parse Standard Array by Class table** (Step 3)
   - Extract per-class ability score recommendations

5. **Parse Alignments section** (Step 4)
   - Extract 9 alignments with code, name, description

6. **Parse Hit Points tables** (Step 5)
   - Level 1 Hit Points by Class
   - Fixed Hit Points by Class (for leveling)

7. **Parse Starting Equipment at Higher Levels table**
   - Extract level ranges with equipment/magic items

8. **Parse Trinkets table**
   - Extract all 100 trinket entries

9. **Merge glossary rules** (from rules-parser.ts)
   - Parse actions, conditions, cover from glossary
   - Add to same output file

### Output File Change

- Current: `data/rules/character-rules.json` + `data/rules/combat-rules.json`
- New: `data/rules/rules.json` (single consolidated file)

---

## Task 3: Convert spell-parser.ts to V2

**Complexity**: Large  
**Files to create/modify**:
- Create: `scripts/parsers/spell-parser-v2.ts`
- Delete: `scripts/parsers/spell-parser.ts` (after V2 works)
- Edit: `scripts/preprocess.ts` - switch import

### Implementation Approach

1. **Use marked.js AST** instead of regex
2. **Read from normalized directory** like other V2 parsers
3. **Keep same output schema** - `SpellsByName` and `SpellsByClass` interfaces unchanged
4. **Use parser-utils.ts** utilities where applicable

### Key Parsing Logic

```typescript
// Spell sections start with ### heading
// Example structure:
// ### Acid Splash
// *Cantrip (Sorcerer, Wizard)*
// **Casting Time:** Action
// **Range:** 60 feet
// **Components:** V, S
// **Duration:** Instantaneous
// 
// Description paragraphs...
// 
// ***Cantrip Upgrade.*** At 5th level...

function parseSpellFromTokens(name: string, tokens: Token[]): Spell {
  // 1. Find italic line with level/school/classes
  // 2. Extract bold fields (Casting Time, Range, Components, Duration)
  // 3. Collect description paragraphs
  // 4. Look for ***Using a Higher-Level Spell Slot.*** section
  // 5. Look for ***Cantrip Upgrade.*** section
}
```

### Spell Files to Parse

- `DND5eSRD_104-120.md` (normalized)
- `DND5eSRD_121-137.md` (normalized)
- `DND5eSRD_138-154.md` (normalized)
- `DND5eSRD_155-175.md` (normalized)

---

## Task 4: Delete rules-parser.ts

**Complexity**: Simple  
**Timing**: After Task 2 (merged into character-rules-parser)

**Files to modify**:
- Delete: `scripts/parsers/rules-parser.ts`
- Edit: `scripts/preprocess.ts` - remove import and call
- Delete: `data/rules/combat-rules.json` (merged into rules.json)

---

## Task 5: Update preprocess.ts

**Final state of imports**:

```typescript
import { parseClasses } from "./parsers/class-parser-v2.ts";
import { parseSpells } from "./parsers/spell-parser-v2.ts";  // Changed
import { parseBackgrounds } from "./parsers/background-parser.ts";
import { parseSpecies } from "./parsers/species-parser-v2.ts";
import { parseFeats } from "./parsers/feat-parser.ts";
import { parseCharacterRules } from "./parsers/character-rules-parser.ts";  // Now includes combat rules

// REMOVED:
// - parseRaces (replaced by parseSpecies)
// - parseRules (merged into parseCharacterRules)
```

---

## Implementation Order

1. **Task 1: Remove race-parser.ts** (5 min)
   - Quick cleanup, no dependencies

2. **Task 2: Fix character-rules-parser.ts** (2-3 hours)
   - Update types first
   - Add table parsing functions
   - Merge glossary parsing
   - Test output structure

3. **Task 4: Delete rules-parser.ts** (5 min)
   - After Task 2 completes

4. **Task 3: Convert spell-parser.ts to V2** (1-2 hours)
   - Create new V2 parser
   - Test against existing output
   - Replace old parser

5. **Task 5: Update preprocess.ts** (10 min)
   - Final cleanup

---

## Validation Checklist

After implementation, verify:

- [ ] `deno task preprocess` runs without errors
- [ ] All 12 classes parse (existing)
- [ ] All 13 species parse (existing)
- [ ] All 4 backgrounds parse (existing)
- [ ] All feats parse (existing)
- [ ] All 198 spells parse with V2 parser
- [ ] Character rules JSON has no raw markdown `content` fields
- [ ] Trinkets table has 100 entries
- [ ] Alignments are structured objects (9 total)
- [ ] Actions, conditions, cover are in rules.json
- [ ] No `data/races/` directory exists
- [ ] No `combat-rules.json` exists (merged)

---

## Risk Mitigation

1. **Keep old parsers until V2 verified** - Don't delete until new output matches
2. **Compare JSON output** - Diff old vs new spell output to catch regressions
3. **Run incrementally** - Test each parser change before moving to next

