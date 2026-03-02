import { DataLoader } from "../utils/data-loader.ts";
import type { FeatData } from "../types/feat-types.ts";

/**
 * Service for feat-related operations
 */
export class FeatService {
  private loader: DataLoader;

  constructor(loader: DataLoader) {
    this.loader = loader;
  }

  /**
   * List feats with optional filtering
   */
  async listFeats(filters?: { category?: string; repeatable?: boolean }): Promise<FeatData[]> {
    let feats = await this.loader.loadFeats();

    // Apply category filter
    if (filters?.category) {
      feats = feats.filter(f => f.category === filters.category);
    }

    // Apply repeatable filter
    if (filters?.repeatable !== undefined) {
      feats = feats.filter(f => f.repeatable === filters.repeatable);
    }

    return feats;
  }

  /**
   * Get details for a specific feat by name (case-insensitive)
   */
  async getFeatDetails(featName: string): Promise<FeatData | null> {
    const feats = await this.loader.loadFeats();

    // Try exact match first
    const exactMatch = feats.find(f => f.name === featName);
    if (exactMatch) {
      return exactMatch;
    }

    // Try case-insensitive match
    const normalizedQuery = featName.toLowerCase();
    const caseInsensitiveMatch = feats.find(
      f => f.name.toLowerCase() === normalizedQuery
    );

    return caseInsensitiveMatch || null;
  }
}
