import type { SourceReference } from "./common-types.ts";

export type FeatCategory =
  | "Origin"
  | "General"
  | "Fighting Style"
  | "Epic Boon";

export interface FeatData {
  name: string;
  category: FeatCategory;
  repeatable: boolean;
  prerequisite?: string;
  description: string[];
  source: SourceReference;
}

export interface FeatsByCategory {
  [category: string]: FeatData[];
}
