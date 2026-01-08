import { DataLoader } from "../data/data-loader.ts";
import type { CombatRules } from "../types/rule-types.ts";

/**
 * Service for combat rules operations
 */
export class RulesService {
  private loader: DataLoader;

  constructor(loader: DataLoader) {
    this.loader = loader;
  }

  /**
   * Get a specific combat rule by topic
   */
  async getCombatRule(topic: string): Promise<string | null> {
    const rules = await this.loader.loadCombatRules();
    const normalizedTopic = topic.toLowerCase().trim();

    // Search in actions
    if (rules.actions && Array.isArray(rules.actions)) {
      for (const action of rules.actions) {
        if (action.name.toLowerCase() === normalizedTopic) {
          return `**${action.name}**: ${action.description}`;
        }
      }
    }

    // Search in conditions
    if (rules.conditions && Array.isArray(rules.conditions)) {
      for (const condition of rules.conditions) {
        if (condition.name.toLowerCase() === normalizedTopic) {
          return `**${condition.name}**: ${condition.description}`;
        }
      }
    }

    // Search in cover
    if (rules.cover && Array.isArray(rules.cover)) {
      for (const coverType of rules.cover) {
        if (coverType.name.toLowerCase().includes(normalizedTopic)) {
          return `**${coverType.name}**: ${coverType.description}`;
        }
      }
    }

    // Search in alignments
    if (rules.alignments && Array.isArray(rules.alignments)) {
      for (const alignment of rules.alignments) {
        if (
          alignment.name.toLowerCase() === normalizedTopic ||
          alignment.code.toLowerCase() === normalizedTopic
        ) {
          return `**${alignment.name}** (${alignment.code}): ${alignment.description}`;
        }
      }
    }

    // Search in ability scores
    if (rules.abilityScores && Array.isArray(rules.abilityScores)) {
      for (const ability of rules.abilityScores) {
        if (ability.name.toLowerCase() === normalizedTopic) {
          return `**${ability.name}**: ${ability.description}`;
        }
      }
    }

    // Search all array-based categories
    for (const [category, items] of Object.entries(rules)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          if (
            item.name &&
            typeof item.name === "string" &&
            item.name.toLowerCase().includes(normalizedTopic)
          ) {
            const description = item.description || JSON.stringify(item);
            return `**${item.name}** (${category}): ${description}`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get all combat rules
   */
  async getAllRules(): Promise<CombatRules> {
    return await this.loader.loadCombatRules();
  }
}
