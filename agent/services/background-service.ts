import { DataLoader } from "../utils/data-loader.ts";
import type { BackgroundData } from "../types/background-types.ts";

/**
 * Service for background-related operations
 */
export class BackgroundService {
  private loader: DataLoader;

  constructor(loader: DataLoader) {
    this.loader = loader;
  }

  /**
   * List all backgrounds
   */
  async listBackgrounds(): Promise<BackgroundData[]> {
    return await this.loader.loadBackgrounds();
  }

  /**
   * Get details for a specific background by name (case-insensitive)
   */
  async getBackgroundDetails(backgroundName: string): Promise<BackgroundData | null> {
    const backgrounds = await this.loader.loadBackgrounds();

    // Try exact match first
    const exactMatch = backgrounds.find(b => b.name === backgroundName);
    if (exactMatch) {
      return exactMatch;
    }

    // Try case-insensitive match
    const normalizedQuery = backgroundName.toLowerCase();
    const caseInsensitiveMatch = backgrounds.find(
      b => b.name.toLowerCase() === normalizedQuery
    );

    return caseInsensitiveMatch || null;
  }
}
