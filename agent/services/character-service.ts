import type { DataLoader } from "../utils/data-loader.ts";
import { parsePrerequisite, type PrerequisiteRule } from "../utils/prerequisite-parser.ts";
import type { FeatData } from "../types/feat-types.ts";

export interface CharacterState {
  level: number;
  classes: string[];
  features: string[];
  abilityScores: Record<string, number>;
}

export interface ValidationResult {
  valid: boolean;
  reason: string;
}

/**
 * Service for character-related validation
 */
export class CharacterService {
  private loader: DataLoader;

  constructor(loader: DataLoader) {
    this.loader = loader;
  }

  /**
   * Validates if a character choice (e.g., feat) is valid against the SRD.
   */
  async validateChoice(
    choiceType: "feat" | "spell",
    choiceName: string,
    characterState: CharacterState
  ): Promise<ValidationResult> {
    if (choiceType === "feat") {
      return await this.validateFeatChoice(choiceName, characterState);
    }
    
    // Spell validation can be added here if needed
    return { valid: true, reason: "Not yet implemented" };
  }

  private async validateFeatChoice(
    featName: string,
    characterState: CharacterState
  ): Promise<ValidationResult> {
    const feats = await this.loader.loadFeats();
    const feat = feats.find(f => f.name.toLowerCase() === featName.toLowerCase());

    if (!feat) {
      return { valid: false, reason: `Feat '${featName}' not found in SRD.` };
    }

    if (!feat.prerequisite) {
      return { valid: true, reason: "No prerequisites for this feat." };
    }

    const rule = parsePrerequisite(feat.prerequisite);
    if (!rule) {
      return { valid: true, reason: "Prerequisite could not be parsed but is likely met." };
    }

    const met = this.evaluateRule(rule, characterState);
    if (met) {
      return { valid: true, reason: `Meets prerequisite: ${feat.prerequisite}` };
    } else {
      return { valid: false, reason: `Does not meet prerequisite: ${feat.prerequisite}` };
    }
  }

  private evaluateRule(rule: PrerequisiteRule, state: CharacterState): boolean {
    switch (rule.type) {
      case "level":
        return state.level >= (rule.value as number);
      
      case "ability":
        if (rule.ability) {
          const score = state.abilityScores[rule.ability.toLowerCase()] || 0;
          return score >= (rule.value as number);
        }
        return false;
      
      case "feature":
        return state.features.some(f => f.toLowerCase().includes((rule.value as string).toLowerCase()));
      
      case "composite":
        if (rule.rules) {
          if (rule.operator === "and") {
            return rule.rules.every(r => this.evaluateRule(r, state));
          } else {
            return rule.rules.some(r => this.evaluateRule(r, state));
          }
        }
        return false;
      
      default:
        return false;
    }
  }
}
