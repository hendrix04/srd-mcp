import type { AbilityScore, ArmorType, Skill, SourceReference, WeaponProficiency } from "./common-types.ts";

export interface SkillChoice {
  count: number;
  options: Skill[];
}

export interface EquipmentOption {
  option: string;
  items?: string[];
  gold?: number;
}

export interface ClassLevelData {
  proficiencyBonus: number;
  features: string[];
  [key: string]: number | string | string[]; // Class-specific progression (e.g., rages, spell slots)
}

export interface ClassFeature {
  level: number;
  name: string;
  description: string;
}

export interface Subclass {
  name: string;
  description: string;
  features: {
    [level: string]: string[]; // level -> feature names
  };
}

export interface ClassData {
  name: string;
  primaryAbility: AbilityScore | AbilityScore[];
  hitDie: string; // e.g., "d12"
  savingThrows: AbilityScore[];
  skillChoices: SkillChoice;
  armorProficiencies: ArmorType[];
  weaponProficiencies: WeaponProficiency[];
  startingEquipment: EquipmentOption[];
  levels: {
    [level: string]: ClassLevelData; // "1" -> level 1 data
  };
  features: {
    [featureName: string]: ClassFeature;
  };
  subclasses?: {
    [subclassName: string]: Subclass;
  };
  spellcasting?: boolean;
  source: SourceReference;
}

export interface ClassSummary {
  name: string;
  primaryAbility: AbilityScore | AbilityScore[];
  description: string;
}
