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
    if (rules.actions) {
      for (const [action, description] of Object.entries(rules.actions)) {
        if (action.toLowerCase() === normalizedTopic) {
          return `**${action}**: ${description}`;
        }
      }
    }

    // Search in conditions
    if (rules.conditions) {
      for (const [condition, description] of Object.entries(rules.conditions)) {
        if (condition.toLowerCase() === normalizedTopic) {
          return `**${condition}**: ${description}`;
        }
      }
    }

    // Search in cover
    if (rules.cover) {
      for (const [coverType, description] of Object.entries(rules.cover)) {
        if (coverType.toLowerCase().includes(normalizedTopic)) {
          return `**${coverType}**: ${description}`;
        }
      }
    }

    // Search all categories
    for (const [category, items] of Object.entries(rules)) {
      if (typeof items === "object") {
        for (const [key, value] of Object.entries(items)) {
          if (key.toLowerCase().includes(normalizedTopic)) {
            return `**${key}** (${category}): ${value}`;
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
