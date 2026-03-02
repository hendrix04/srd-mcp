import { DataLoader } from "../data/data-loader.ts";
import { fuzzyMatch } from "../utils/fuzzy-search.ts";
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

    let bestMatch: { score: number; text: string | null } = { score: 0, text: null };

    for (const [category, items] of Object.entries(rules)) {
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const name = (item.name || item.className) as string | undefined;
        if (!name) continue;

        const description = this.formatDescription(item, category);
        const score = fuzzyMatch(normalizedTopic, name);

        // Exact match: return immediately
        if (name.toLowerCase() === normalizedTopic) {
          return `**${name}**${this.getCategoryLabel(category)}: ${description}`;
        }

        // Fuzzy match: track best
        if (score > bestMatch.score && score >= 0.7) {
          bestMatch = {
            score,
            text: `**${name}**${this.getCategoryLabel(category)}: ${description}`,
          };
        }
      }
    }

    return bestMatch.text;
  }

  /**
   * Format the description based on item properties
   */
  private formatDescription(item: any, category: string): string {
    if (item.description) return item.description;
    if (category === "classOverview") {
      return `Likes: ${item.likes}, Primary Ability: ${item.primaryAbility}, Complexity: ${item.complexity}`;
    }
    if (category === "currency") {
      return `${item.abbreviation} (${item.copperValue} CP)`;
    }
    if (category === "alignments") {
      return `(${item.code}) ${item.description || ""}`;
    }
    return JSON.stringify(item);
  }

  /**
   * Get a readable category label
   */
  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      classOverview: " (Class Overview)",
      abilityScores: " (Ability Score)",
      standardLanguages: " (Language)",
      rareLanguages: " (Rare Language)",
      conditions: " (Condition)",
      actions: " (Action)",
    };
    return labels[category] || "";
  }

  /**
   * Get all combat rules
   */
  async getAllRules(): Promise<CombatRules> {
    return await this.loader.loadCombatRules();
  }
}
