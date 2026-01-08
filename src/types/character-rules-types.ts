import type { SourceReference } from "./common-types.ts";

// =============================================================================
// Character Creation Types
// =============================================================================

export interface ClassOverview {
  className: string;
  likes: string;
  primaryAbility: string;
  complexity: "Low" | "Average" | "High";
}

export interface StandardArrayByClass {
  className: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface HitPointsByClass {
  className: string;
  hitDie: number;
  level1HitPoints: string;
  fixedPerLevel: string;
}

export interface Alignment {
  code: string;
  name: string;
  description: string;
}

export interface Language {
  name: string;
  roll?: string;
  notes?: string;
}

export interface HigherLevelStartingEquipment {
  levelRange: string;
  equipmentAndMoney: string;
  magicItems: string;
}

export interface Trinket {
  roll: number;
  description: string;
}

export interface LevelUpStep {
  stepNumber: number;
  title: string;
  description: string;
}

// =============================================================================
// Ability Score Types
// =============================================================================

export interface AbilityScoreGenerationMethod {
  name: "Standard Array" | "Random Generation" | "Point Cost";
  description: string;
  details?: {
    standardArray?: number[];
    pointBudget?: number;
    pointCosts?: Record<number, number>;
  };
}

// =============================================================================
// Level Advancement Types
// =============================================================================

export interface LevelAdvancement {
  level: number;
  experiencePoints: number;
  proficiencyBonus: number;
}

export interface TierOfPlay {
  tier: number;
  levels: string;
  title: string;
  description: string;
}

// =============================================================================
// Multiclassing Types
// =============================================================================

export interface MulticlassingPrerequisite {
  className: string;
  primaryAbility: string;
  minimumScore: number;
}

export interface MulticlassSpellSlots {
  level: number;
  slots: Record<number, number>;
}

export interface MulticlassingRules {
  description: string;
  prerequisites: MulticlassingPrerequisite[];
  spellSlots: MulticlassSpellSlots[];
  rules: {
    experiencePoints: string;
    hitPoints: string;
    proficiencyBonus: string;
    proficiencies: string;
    classFeatures: string;
  };
}

// =============================================================================
// Combat Rules Types (merged from rules-parser)
// =============================================================================

export interface Condition {
  name: string;
  description: string;
}

export interface Action {
  name: string;
  description: string;
}

export interface CoverType {
  name: string;
  description: string;
}

export interface AbilityScoreReference {
  name: string;
  skills: string[];
  description: string;
}

export interface LightLevel {
  name: string;
  description: string;
}

export interface RestType {
  name: string;
  description: string;
}

export interface CurrencyType {
  name: string;
  abbreviation: string;
  copperValue: number;
}

// =============================================================================
// Main Character Rules Interface
// =============================================================================

export interface CharacterRules {
  // Character Creation
  classOverview: ClassOverview[];
  standardArrayByClass: StandardArrayByClass[];
  hitPointsByClass: HitPointsByClass[];
  alignments: Alignment[];
  standardLanguages: Language[];
  rareLanguages: Language[];
  higherLevelStartingEquipment: HigherLevelStartingEquipment[];
  trinkets: Trinket[];

  // Ability Scores
  abilityScoreGeneration: AbilityScoreGenerationMethod[];
  abilityScoreModifiers: Record<number, number>;

  // Level Advancement
  levelAdvancement: LevelAdvancement[];
  levelUpSteps: LevelUpStep[];
  tiersOfPlay: TierOfPlay[];

  // Multiclassing
  multiclassing: MulticlassingRules;

  // Combat Rules (merged from glossary)
  conditions: Condition[];
  actions: Action[];
  cover: CoverType[];
  abilityScores: AbilityScoreReference[];
  lightLevels: LightLevel[];
  resting: RestType[];
  currency: CurrencyType[];

  source: SourceReference;
}
