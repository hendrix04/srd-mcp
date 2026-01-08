import type { SourceReference } from "./common-types.ts";

export interface WeaponData {
  name: string;
  category: "Simple" | "Martial";
  type: "Melee" | "Ranged";
  damage: string;
  damageType: string;
  properties: string[];
  weight: string;
  cost: string;
  source: SourceReference;
}

export interface ArmorData {
  name: string;
  category: "Light" | "Medium" | "Heavy" | "Shield";
  armorClass: string;
  strengthRequirement?: string;
  stealthDisadvantage: boolean;
  weight: string;
  cost: string;
  source: SourceReference;
}

export interface ToolData {
  name: string;
  category: string;
  cost?: string;
  weight?: string;
  description?: string;
  source: SourceReference;
}

export interface AdventuringGearData {
  name: string;
  cost: string;
  weight?: string;
  description?: string;
  source: SourceReference;
}
