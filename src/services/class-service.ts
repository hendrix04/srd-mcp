import { DataLoader } from "../data/data-loader.ts";
import type { ClassData, ClassSummary } from "../types/class-types.ts";

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
      primaryAbility: classData.primaryAbility,
      description: `Hit Die: ${classData.hitDie}, Saves: ${classData.savingThrows.join(", ")}`,
    }));
  }

  /**
   * Get class details, optionally filtered by level
   */
  async getClassDetails(className: string, level?: number): Promise<ClassData | null> {
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
    // Filter levels
    const filteredLevels: ClassData["levels"] = {};
    for (let i = 1; i <= level; i++) {
      const levelKey = i.toString();
      if (classData.levels[levelKey]) {
        filteredLevels[levelKey] = classData.levels[levelKey];
      }
    }

    // Filter features (only those available at or below the specified level)
    const filteredFeatures: ClassData["features"] = {};
    for (const [featureName, feature] of Object.entries(classData.features)) {
      if (feature.level <= level) {
        filteredFeatures[featureName] = feature;
      }
    }

    return {
      ...classData,
      levels: filteredLevels,
      features: filteredFeatures,
    };
  }
}
