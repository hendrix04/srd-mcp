import { join, dirname } from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { SpellsByName, SpellsByClass } from "../types/spell-types.ts";
import type { ClassData } from "../types/class-types.ts";
import type { SpeciesData } from "../types/species-types.ts";
import type { BackgroundData } from "../types/background-types.ts";
import type { FeatData } from "../types/feat-types.ts";
import type { CombatRules } from "../types/rule-types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "../../");

/**
 * Centrally managed data loader with in-memory caching and Singleton pattern.
 * Optimized for Gemini CLI sub-agent natively in Node.js.
 */
export class DataLoader {
  private static instance: DataLoader;
  private basePath: string;
  private cache: Map<string, any> = new Map();

  private constructor(basePath: string) {
    this.basePath = basePath;
  }

  public static getInstance(basePath?: string): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader(basePath || PROJECT_ROOT);
    }
    return DataLoader.instance;
  }

  private async loadJson<T>(filePath: string): Promise<T> {
    if (this.cache.has(filePath)) return this.cache.get(filePath);

    try {
      const fullPath = join(this.basePath, filePath);
      const content = await readFile(fullPath, "utf-8");
      const data = JSON.parse(content);
      this.cache.set(filePath, data);
      return data;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to load data from ${filePath}: ${err.message}. Make sure to run 'deno task preprocess' first.`);
    }
  }

  private async loadAllInDir<T>(subDir: string): Promise<T[]> {
    try {
      const dirPath = join(this.basePath, subDir);
      const files = (await readdir(dirPath)).filter(f => f.endsWith(".json"));
      
      const results: T[] = [];
      for (const file of files) {
        try {
          const data = await this.loadJson<T>(join(subDir, file));
          results.push(data);
        } catch { /* Skip missing/corrupted */ }
      }
      return results;
    } catch { return []; }
  }

  async loadSpellsByName(): Promise<SpellsByName> {
    return this.loadJson<SpellsByName>("data/spells/spells-by-name.json");
  }

  async loadSpellsByClass(): Promise<SpellsByClass> {
    return this.loadJson<SpellsByClass>("data/spells/spells-by-class.json");
  }

  async loadClass(className: string): Promise<ClassData | null> {
    try {
      const fileName = className.toLowerCase().replace(/\s+/g, "_") + ".json";
      return await this.loadJson<ClassData>(join("data/classes", fileName));
    } catch { return null; }
  }

  async loadAllClasses(): Promise<ClassData[]> {
    return this.loadAllInDir<ClassData>("data/classes");
  }

  async loadAllSpecies(): Promise<SpeciesData[]> {
    return this.loadAllInDir<SpeciesData>("data/species");
  }

  async loadBackgrounds(): Promise<BackgroundData[]> {
    try {
      return await this.loadJson<BackgroundData[]>("data/backgrounds/backgrounds.json");
    } catch { return []; }
  }

  async loadFeats(): Promise<FeatData[]> {
    try {
      return await this.loadJson<FeatData[]>("data/feats/feats.json");
    } catch { return []; }
  }

  async loadCombatRules(): Promise<CombatRules> {
    return this.loadJson<CombatRules>("data/rules/rules.json");
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const dataLoader = DataLoader.getInstance();
