import { DataLoader } from "../utils/data-loader.ts";
import type { ClassData } from "../types/class-types.ts";

export interface ClassSummary {
  name: string;
  primaryAbility: string;
  description: string;
}

/**
 * Service for class-related operations
 */
export class ClassService {
  private loader: DataLoader;

  constructor(loader: DataLoader) {
    this.loader = loader;
  }

  /**
   * List all classes with basic info
   */
  async listClasses(): Promise<ClassSummary[]> {
    const classes = await this.loader.loadAllClasses();

    return classes.map((classData) => ({
      name: classData.name,
      primaryAbility: classData.coreTraits.primaryAbility,
      description: `Hit Die: ${classData.coreTraits.hitDie}, Saves: ${classData.coreTraits.savingThrows.join(", ")}`,
    }));
  }

  /**
   * Get class details, optionally filtered by level
   */
  async getClassDetails(
    className: string,
    level?: number,
  ): Promise<ClassData | null> {
    const classData = await this.loader.loadClass(className);

    if (!classData) {
      return null;
    }

    // If level specified, filter to only include data up to that level
    if (level !== undefined) {
      return this.filterByLevel(classData, level);
    }

    return classData;
  }

  /**
   * Filter class data to only include information up to a specific level
   */
  private filterByLevel(classData: ClassData, level: number): ClassData {
    // Filter progression (only levels 1 through requested level)
    const filteredProgression = classData.progression.filter(
      (p) => p.level <= level,
    );

    // Filter features (only those available at or below the specified level)
    const filteredFeatures = classData.features.filter((f) => f.level <= level);

    // Filter feature levels
    const filteredFeatureLevels = classData.featureLevels.filter(
      (l) => l <= level,
    );

    return {
      ...classData,
      progression: filteredProgression,
      features: filteredFeatures,
      featureLevels: filteredFeatureLevels,
    };
  }
}
