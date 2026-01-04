import { DataLoader } from "../data/data-loader.ts";
import type { Spell, SpellFilters, SpellSearchResult } from "../types/spell-types.ts";
import { fuzzyMatch, normalizeClassName, normalizeSchool } from "../utils/fuzzy-search.ts";

/**
 * Service for spell-related operations
 */
export class SpellService {
  private loader: DataLoader;

  constructor(loader: DataLoader) {
    this.loader = loader;
  }

  /**
   * List spells with optional filters
   */
  async listSpells(filters?: SpellFilters): Promise<string[]> {
    let spellNames: string[] = [];

    if (filters?.className) {
      // Use class index for efficient filtering
      const spellsByClass = await this.loader.loadSpellsByClass();
      const normalizedClass = normalizeClassName(filters.className);

      // Find matching class (case-insensitive)
      const matchingClass = Object.keys(spellsByClass).find(
        (className) => normalizeClassName(className) === normalizedClass
      );

      if (matchingClass) {
        const classSpells = spellsByClass[matchingClass];

        if (filters.level !== undefined) {
          // Specific level
          spellNames = classSpells[filters.level.toString()] || [];
        } else {
          // All levels for this class
          spellNames = Object.values(classSpells).flat();
        }
      }
    } else {
      // All spells
      const spellsByName = await this.loader.loadSpellsByName();
      spellNames = Object.keys(spellsByName);

      // Filter by level if specified
      if (filters?.level !== undefined) {
        spellNames = spellNames.filter(
          (name) => spellsByName[name].level === filters.level
        );
      }
    }

    // Filter by school (post-filter, reuse already-loaded spellsByName or load if needed)
    if (filters?.school) {
      const spellsByName = filters?.className
        ? await this.loader.loadSpellsByName() // Need to load if we used class index
        : await this.loader.loadSpellsByName(); // Will hit cache if already loaded
      const normalizedSchool = normalizeSchool(filters.school);

      spellNames = spellNames.filter((name) => {
        const spell = spellsByName[name];
        return normalizeSchool(spell.school) === normalizedSchool;
      });
    }

    return spellNames.sort();
  }

  /**
   * Get full spell details by name (case-insensitive)
   */
  async getSpellByName(name: string): Promise<Spell | null> {
    const spellsByName = await this.loader.loadSpellsByName();

    // Try exact match first
    if (spellsByName[name]) {
      return spellsByName[name];
    }

    // Try case-insensitive match
    const normalizedQuery = name.toLowerCase();
    for (const [spellName, spell] of Object.entries(spellsByName)) {
      if (spellName.toLowerCase() === normalizedQuery) {
        return spell;
      }
    }

    return null;
  }

  /**
   * Search spells by name (fuzzy matching)
   */
  async searchSpells(query: string, limit = 10): Promise<SpellSearchResult[]> {
    const spellsByName = await this.loader.loadSpellsByName();
    const spellNames = Object.keys(spellsByName);

    // Score each spell name
    const results: SpellSearchResult[] = spellNames
      .map((name) => ({
        name,
        score: fuzzyMatch(query, name),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }
}
