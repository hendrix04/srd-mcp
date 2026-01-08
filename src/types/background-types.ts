import type { SourceReference } from "./common-types.ts";

export interface BackgroundData {
  name: string;
  abilityScoreIncrease: string[];
  feat: string;
  skillProficiencies: string[];
  toolProficiency: string;
  equipment: string;
  source: SourceReference;
}

export interface BackgroundsByName {
  [name: string]: BackgroundData;
}
