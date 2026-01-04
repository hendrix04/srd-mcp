import { DataLoader } from "../data/data-loader.ts";
import type { RaceData, RaceSummary } from "../types/race-types.ts";

/**
 * Service for race-related operations
 */
export class RaceService {
  private loader: DataLoader;

  constructor(loader: DataLoader) {
    this.loader = loader;
  }

  /**
   * List all races with basic info
   */
  async listRaces(): Promise<RaceSummary[]> {
    const races = await this.loader.loadAllRaces();

    return races.map((race) => ({
      name: race.name,
      size: race.size,
      speed: race.speed,
    }));
  }

  /**
   * Get full race details
   */
  async getRaceDetails(raceName: string): Promise<RaceData | null> {
    return await this.loader.loadRace(raceName);
  }
}
