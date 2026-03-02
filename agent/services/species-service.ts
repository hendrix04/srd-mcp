import { DataLoader } from "../utils/data-loader.ts";
import type { SpeciesData, SpeciesSummary } from "../types/species-types.ts";

/**
 * Service for species-related operations
 */
export class SpeciesService {
  private loader: DataLoader;

  constructor(loader: DataLoader) {
    this.loader = loader;
  }

  /**
   * List all species with basic info
   */
  async listSpecies(): Promise<SpeciesSummary[]> {
    const species = await this.loader.loadAllSpecies();

    return species.map((s) => ({
      name: s.name,
      size: s.size,
      speed: s.speed,
    }));
  }

  /**
   * Get full species details (case-insensitive)
   */
  async getSpeciesDetails(speciesName: string): Promise<SpeciesData | null> {
    const allSpecies = await this.loader.loadAllSpecies();

    // Try exact match first
    const exactMatch = allSpecies.find((s) => s.name === speciesName);
    if (exactMatch) {
      return exactMatch;
    }

    // Try case-insensitive match
    const normalizedQuery = speciesName.toLowerCase();
    const caseInsensitiveMatch = allSpecies.find(
      (s) => s.name.toLowerCase() === normalizedQuery,
    );

    return caseInsensitiveMatch || null;
  }
}
