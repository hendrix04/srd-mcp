export interface CombatRules {
  actions?: Array<{ name: string; description: string }>;
  conditions?: Array<{ name: string; description: string }>;
  cover?: Array<{ name: string; description: string }>;
  alignments?: Array<{ name: string; code: string; description: string }>;
  abilityScores?: Array<{
    name: string;
    skills: string[];
    description: string;
  }>;
  standardLanguages?: Array<{ name: string; roll?: string }>;
  rareLanguages?: Array<{ name: string; notes?: string }>;
  lightLevels?: Array<{ name: string; description: string }>;
  resting?: Array<{ name: string; description: string }>;
  currency?: Array<{ name: string; abbreviation: string; copperValue: number }>;
  [category: string]: any; // Allow other dynamic categories
}
