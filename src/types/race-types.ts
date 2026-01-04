import type { SourceReference } from "./common-types.ts";

export type Size = "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";

export interface RaceTrait {
  name: string;
  description: string;
}

export interface Subrace {
  name: string;
  additionalTraits: RaceTrait[];
}

export interface RaceData {
  name: string;
  size: Size;
  speed: number;
  traits: RaceTrait[];
  languages?: string[];
  subraces?: {
    [subraceName: string]: Subrace;
  };
  source: SourceReference;
}

export interface RaceSummary {
  name: string;
  size: Size;
  speed: number;
}
