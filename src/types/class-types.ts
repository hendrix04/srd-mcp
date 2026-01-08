/**
 * Type definitions for D&D 5E class data
 * Optimized for MCP server queries
 */

/**
 * Equipment option for starting equipment choices
 */
export interface EquipmentOption {
  option: string;
  items?: string[];
  gold?: number;
}

/**
 * Full feature definition with description
 */
export interface Feature {
  name: string;
  level: number;
  description: string;
  /** Whether this is a subclass feature */
  isSubclassFeature?: boolean;
}

/**
 * Progression data for a single level
 * Optimized for "What do I get at level X?" queries
 */
export interface LevelProgression {
  level: number;
  proficiencyBonus: number;

  /** Features gained specifically at this level (with full descriptions) */
  featuresGained: Feature[];

  /** All features available at this level (cumulative) - just names for quick reference */
  allFeatures: string[];

  /** Class-specific metrics that change at this level */
  metrics: {
    /** Spell slots by spell level (1-9) */
    spellSlots?: Record<number, number>;
    /** Other class-specific metrics (e.g., rages, ki points, sorcery points) */
    [key: string]: number | string | Record<number, number> | undefined;
  };

  /** Metrics that changed from previous level (for quick diff view) */
  metricsChanged?: string[];
}

/**
 * Skill selection configuration
 */
export interface SkillChoice {
  count: number;
  from: string[]; // Clean array of individual skills
}

/**
 * Multiclass requirements and benefits
 */
export interface MulticlassInfo {
  /** Prerequisites to multiclass into this class */
  prerequisites?: {
    /** Minimum ability score requirements (e.g., "Strength 13" or "Dexterity 13 and Wisdom 13") */
    abilityScores?: string;
  };

  /** What you gain when multiclassing into this class */
  proficienciesGained: {
    armor?: string[];
    weapons?: string[];
    tools?: string[];
    skills?: SkillChoice | null;
  };
}

/**
 * Subclass information
 */
export interface SubclassInfo {
  /** Subclass name */
  name: string;

  /** Level when subclass is chosen */
  gainedAtLevel: number;

  /** Subclass flavor/description */
  description?: string;

  /** Levels when subclass grants features */
  featureLevels?: number[];

  /** Subclass-specific features */
  features?: Feature[];
}

/**
 * Complete class definition
 * Designed for efficient MCP tool queries
 */
export interface ClassData {
  /** Class name */
  name: string;

  /** Class description/flavor text */
  description?: string;

  /** Core traits from overview table */
  coreTraits: {
    primaryAbility: string;
    hitDie: string;
    savingThrows: string[];
    skillChoices: SkillChoice;
    armorProficiencies: string[];
    weaponProficiencies: string[];
    toolProficiencies?: string[];
  };

  /** Starting equipment options */
  startingEquipment: EquipmentOption[];

  /** Multiclass information */
  multiclass?: MulticlassInfo;

  /** Level-by-level progression (1-20) */
  progression: LevelProgression[];

  /** All unique features available to this class */
  features: Feature[];

  /** Quick reference: what levels grant new features */
  featureLevels: number[];

  /** Included subclass(es) - SRD typically includes one example per class */
  subclasses?: SubclassInfo[];

  /** Source file info */
  source: {
    file: string;
    line?: number;
  };
}

/**
 * Response type for "what do I get at level X" queries
 */
export interface LevelUpSummary {
  className: string;
  level: number;
  proficiencyBonus: number;
  newFeatures: Feature[];
  updatedMetrics: Record<
    string,
    { old: number | string; new: number | string }
  >;
  hitDieIncrease: string;
}
