import type { MagicSchool, SourceReference } from "./common-types.ts";

export interface SpellComponents {
  V: boolean; // Verbal
  S: boolean; // Somatic
  M: string | null; // Material (description if present)
}

export interface Spell {
  name: string;
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  school: MagicSchool;
  classes: string[];
  castingTime: string;
  range: string;
  components: SpellComponents;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higherLevels?: string; // Upcasting description
  cantrip?: string; // Cantrip scaling description
  source: SourceReference;
}

export interface SpellsByName {
  [spellName: string]: Spell;
}

export interface SpellsByClass {
  [className: string]: {
    [level: string]: string[]; // level -> spell names
  };
}

export interface SpellFilters {
  className?: string;
  level?: number;
  school?: string;
}

export interface SpellSearchResult {
  name: string;
  score: number;
}
