import type { SourceReference } from "./common-types.ts";

export type Size = "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";

export interface SpeciesTrait {
  name: string;
  description: string;
}

export interface Subspecies {
  name: string;
  additionalTraits: SpeciesTrait[];
}

export interface SpeciesData {
  name: string;
  size: Size;
  speed: number;
  traits: SpeciesTrait[];
  languages?: string[];
  subspecies?: {
    [subspeciesName: string]: Subspecies;
  };
  source: SourceReference;
}

export interface SpeciesSummary {
  name: string;
  size: Size;
  speed: number;
}
