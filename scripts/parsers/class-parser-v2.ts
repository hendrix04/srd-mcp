/**
 * Class Parser V2 - MCP Server Optimized
 *
 * Generates class data optimized for MCP server queries
 */

import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type {
  ClassData,
  Feature,
  LevelProgression,
  SkillChoice,
  EquipmentOption,
  MulticlassInfo,
  SubclassInfo,
} from "../../agent/types/class-types.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";

const classNames = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

const classFiles = [
  { file: "DND5eSRD_019-035.md", classes: ["Barbarian", "Bard"] },
  { file: "DND5eSRD_036-046.md", classes: ["Cleric", "Druid"] },
  {
    file: "DND5eSRD_047-063.md",
    classes: ["Fighter", "Monk", "Paladin", "Ranger", "Rogue"],
  },
  { file: "DND5eSRD_064-076.md", classes: ["Sorcerer", "Warlock"] },
  { file: "DND5eSRD_077-086.md", classes: ["Wizard"] },
];

/**
 * Parse skill choices from text, cleaning up artifacts
 */
function parseSkillChoices(text: string): SkillChoice {
  // Extract "choose X" pattern - handle "any", numbers, and words
  const anyMatch = text.match(/choose\s+any\s+(\d+)/i);
  const countMatch = text.match(/choose\s+(\w+)/i) || text.match(/(\d+)/);

  const count = anyMatch
    ? parseInt(anyMatch[1])
    : countMatch
      ? countMatch[1] === "two"
        ? 2
        : countMatch[1] === "three"
          ? 3
          : parseInt(countMatch[1])
      : 2;

  // Check if it's "Choose any X skills" - return empty array for "any"
  if (text.match(/choose\s+any\s+\d+\s+skills/i)) {
    return { count, from: [] };
  }

  // Remove "Choose X:" prefix
  let cleanedText = text.replace(/^Choose\s+\d+:\s*/i, "");

  // Split on various delimiters and clean
  const skills = cleanedText
    .split(/,\s*(?:and\s+)?|(?:,?\s+or\s+)|;\s*/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !s.match(/^(choose|from|the|following|and|or|see|playing|game)$/i),
    )
    .filter((s) => !s.includes("&quot")) // Filter out HTML entities
    .map((s) => s.replace(/\.$/, "").trim());

  return { count, from: skills };
}

/**
 * Parse proficiencies, cleaning up "and" artifacts and HTML entities
 */
function parseProficiencies(text: string): string[] {
  // Decode HTML entities
  const decoded = text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'");

  return decoded
    .split(/,\s*(?:and\s+)?|\s+and\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Normalize feature name (remove usage notes in parens)
 */
function normalizeFeatureName(name: string): string {
  return name.replace(/\s*\([^)]+\)/, "").trim();
}

/**
 * Parse equipment text in format: "Choose A or B: (A) items; or (B) items"
 */
function parseEquipmentText(text: string): EquipmentOption[] {
  const options: EquipmentOption[] = [];

  // Remove "Choose A or B:" or "Choose A, B, or C:" prefix if present
  const choiceLine = text
    .replace(/^Choose\s+[A-Z](?:,\s*[A-Z])*,?\s+or\s+[A-Z]:\s*/i, "")
    .trim();

  // Split by both "; or " and plain ";" to handle multi-option formats
  // E.g., "(A) ... ; (B) ... ; or (C) ..." should split into 3 parts
  const optionTexts = choiceLine.split(/;\s*(?:or\s+)?/);

  for (const optionText of optionTexts) {
    const match = optionText.match(/\(([A-Z])\)\s*(.+)/);
    if (!match) continue;

    const option = match[1];
    const itemsText = match[2].trim();

    // Check if it's just gold
    if (itemsText.match(/^\d+\s*GP$/i)) {
      const goldMatch = itemsText.match(/(\d+)\s*GP/i);
      if (goldMatch) {
        options.push({
          option,
          gold: parseInt(goldMatch[1]),
        });
      }
    } else {
      // Parse item list with optional gold at end
      // Example: "Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP"
      const parts = itemsText.split(/,\s*(?:and\s+)?/);
      const items: string[] = [];
      let gold = 0;

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        const goldMatch = trimmed.match(/^(\d+)\s*GP$/i);
        if (goldMatch) {
          gold = parseInt(goldMatch[1]);
        } else {
          items.push(trimmed);
        }
      }

      const equipOption: EquipmentOption = { option };
      if (items.length > 0) equipOption.items = items;
      if (gold > 0) equipOption.gold = gold;

      options.push(equipOption);
    }
  }

  return options;
}

/**
 * Extract class sections from tokens
 */
function extractClassSections(tokens: Token[]): Map<string, Token[]> {
  const classSections = new Map<string, Token[]>();
  let currentClass: string | null = null;
  let currentTokens: Token[] = [];

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 2) {
      const headerText = token.text;

      // Check if this is a class header
      const matchedClass = classNames.find((name) => {
        if (headerText === name) return true;
        if (headerText.startsWith(`${name} `)) {
          // Exclude subclass-only sections
          if (headerText.startsWith(`${name} Subclass:`)) return false;
          return true;
        }
        return false;
      });

      if (matchedClass) {
        // If we're continuing the same class, just add the token
        if (matchedClass === currentClass) {
          currentTokens.push(token);
        } else {
          // Save previous class if different
          if (currentClass && currentTokens.length > 0) {
            const existing = classSections.get(currentClass) || [];
            classSections.set(currentClass, [...existing, ...currentTokens]);
          }

          // Start new class
          currentClass = matchedClass;
          currentTokens = [token];
        }
      } else if (currentClass) {
        // Non-class h2 header while collecting a class
        // Keep collecting - might be "Becoming a X" or similar
        currentTokens.push(token);
      }
    } else if (currentClass) {
      currentTokens.push(token);
    }
  }

  // Save last class
  if (currentClass && currentTokens.length > 0) {
    const existing = classSections.get(currentClass) || [];
    classSections.set(currentClass, [...existing, ...currentTokens]);
  }

  return classSections;
}

/**
 * Parse core traits from blockquote format (Barbarian/Bard style)
 */
function parseCoreTraitsBlockquote(
  tokens: Token[],
): Partial<ClassData["coreTraits"]> | null {
  for (const token of tokens) {
    if (token.type === "blockquote") {
      const blockquote = token as Tokens.Blockquote;
      const traits: Partial<ClassData["coreTraits"]> = {};

      let currentField = "";

      for (const subToken of blockquote.tokens) {
        if (subToken.type === "paragraph") {
          const para = subToken as Tokens.Paragraph;
          const paraTokens = para.tokens;

          for (let i = 0; i < paraTokens.length; i++) {
            const t = paraTokens[i];

            if (t.type === "strong") {
              currentField = t.text.trim();
            } else if (t.type === "text" && currentField) {
              const value = t.text.trim().replace(/^\n+/, "");

              if (currentField.toLowerCase().includes("primary ability")) {
                traits.primaryAbility = value;
              } else if (
                currentField.toLowerCase().includes("hit point die") ||
                currentField.toLowerCase().includes("hit die")
              ) {
                const dieMatch = value.match(/D\d+/i);
                traits.hitDie = dieMatch ? dieMatch[0].toUpperCase() : value;
              } else if (currentField.toLowerCase().includes("saving throw")) {
                traits.savingThrows = parseProficiencies(value);
              } else if (currentField.toLowerCase().includes("skill")) {
                traits.skillChoices = parseSkillChoices(value);
              } else if (currentField.toLowerCase().includes("weapon")) {
                traits.weaponProficiencies = parseProficiencies(value);
              } else if (currentField.toLowerCase().includes("armor")) {
                traits.armorProficiencies = parseProficiencies(value);
              } else if (currentField.toLowerCase().includes("tool")) {
                traits.toolProficiencies = parseProficiencies(value);
              }
            }
          }
        }
      }

      if (Object.keys(traits).length > 0) {
        return traits;
      }
    }
  }

  return null;
}

/**
 * Parse core traits table (the overview table at the top of each class)
 */
function parseCoreTraitsTable(
  tokens: Token[],
): Partial<ClassData["coreTraits"]> | null {
  // First try blockquote format
  const blockquoteTraits = parseCoreTraitsBlockquote(tokens);
  if (blockquoteTraits) return blockquoteTraits;

  // Then try table format
  for (const token of tokens) {
    if (token.type === "table") {
      const table = token as Tokens.Table;

      // Check if this is the core traits table (2 columns, trait name + value)
      if (table.header.length === 2) {
        const traits: Partial<ClassData["coreTraits"]> = {};

        for (const row of table.rows) {
          const key = row[0]?.text.trim();
          const value = row[1]?.text.trim();

          if (!key || !value) continue;

          if (key.toLowerCase().includes("primary ability")) {
            traits.primaryAbility = value;
          } else if (
            key.toLowerCase().includes("hit point die") ||
            key.toLowerCase().includes("hit die")
          ) {
            // Extract just the die (e.g., "D10" from "D10 per Fighter level")
            const dieMatch = value.match(/D\d+/i);
            traits.hitDie = dieMatch ? dieMatch[0].toUpperCase() : value;
          } else if (key.toLowerCase().includes("saving throw")) {
            traits.savingThrows = parseProficiencies(value);
          } else if (key.toLowerCase().includes("skill")) {
            traits.skillChoices = parseSkillChoices(value);
          } else if (key.toLowerCase().includes("weapon")) {
            traits.weaponProficiencies = parseProficiencies(value);
          } else if (key.toLowerCase().includes("armor")) {
            traits.armorProficiencies = parseProficiencies(value);
          } else if (key.toLowerCase().includes("tool")) {
            traits.toolProficiencies = parseProficiencies(value);
          }
        }

        return traits;
      }
    }
  }

  return null;
}

/**
 * Parse starting equipment from either blockquote or table format
 */
function parseStartingEquipment(tokens: Token[]): EquipmentOption[] {
  const options: EquipmentOption[] = [];

  for (const token of tokens) {
    // Starting equipment can be in tables (newer format)
    if (token.type === "table") {
      const table = token as Tokens.Table;

      // Look for "Starting Equipment" in table
      for (const row of table.rows) {
        const key = row[0]?.text.trim().toLowerCase();
        if (key && key.includes("starting equipment")) {
          const equipmentText = row[1]?.text.trim();
          if (equipmentText) {
            const parsed = parseEquipmentText(equipmentText);
            options.push(...parsed);
            break;
          }
        }
      }

      if (options.length > 0) break;
    }

    // Starting equipment can also be in blockquotes (older format)
    if (token.type === "blockquote") {
      const blockquote = token as Tokens.Blockquote;

      // Look for "Starting Equipment" in blockquote
      for (const subToken of blockquote.tokens) {
        if (subToken.type === "paragraph") {
          const para = subToken as Tokens.Paragraph;
          const text = para.text;

          if (text.includes("**Starting Equipment**")) {
            // Extract the "Choose A or B:" line
            const equipmentText = text
              .replace(/\*\*Starting Equipment\*\*\s*/, "")
              .trim();

            const parsed = parseEquipmentText(equipmentText);
            options.push(...parsed);
            break;
          }
        }
      }

      if (options.length > 0) break;
    }
  }

  return options;
}

/**
 * Parse multiclass information
 */
function parseMulticlass(tokens: Token[]): MulticlassInfo | undefined {
  let inMulticlassSection = false;
  const multiclass: MulticlassInfo = {
    proficienciesGained: {},
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading") {
      const heading = token as Tokens.Heading;
      if (heading.text.toLowerCase().includes("multiclass")) {
        inMulticlassSection = true;
        continue;
      } else if (inMulticlassSection && heading.depth <= 3) {
        // Exit multiclass section
        break;
      }
    }

    if (inMulticlassSection && token.type === "list") {
      const list = token as Tokens.List;
      for (const item of list.items) {
        const text = item.text;
        const lowerText = text.toLowerCase();

        // Look for proficiency gains in the format:
        // "Gain the following traits from the Core X Traits table: Hit Point Die, proficiency with Y, and training with Z."
        if (
          lowerText.includes("proficiency with") ||
          lowerText.includes("training with")
        ) {
          // Extract just the proficiencies part after the colon
          const afterColon = text.split(":").slice(1).join(":").trim();

          // Extract weapon proficiencies (but not tool proficiencies)
          const weaponMatch = afterColon.match(
            /proficiency with ((?:Simple|Martial|Simple and Martial)\s+weapons?)(?:,| and|\.)/i,
          );
          if (weaponMatch) {
            const weaponText = weaponMatch[1].trim();
            multiclass.proficienciesGained.weapons =
              parseProficiencies(weaponText);
          }

          // Extract tool proficiencies
          const toolMatch = afterColon.match(
            /proficiency with ([^,]+?(?:Tools?|Kit))(?:,| and|\.)/i,
          );
          if (toolMatch) {
            const toolText = toolMatch[1].trim();
            multiclass.proficienciesGained.tools = parseProficiencies(toolText);
          }

          // Extract armor/shield training
          const armorMatch = afterColon.match(/training with (.+?)(?:\.|$)/i);
          if (armorMatch) {
            const armorText = armorMatch[1].trim();
            multiclass.proficienciesGained.armor =
              parseProficiencies(armorText);
          }
        }
      }
    }
  }

  // Only return if we found multiclass info
  if (Object.keys(multiclass.proficienciesGained).length > 0) {
    return multiclass;
  }

  return undefined;
}

/**
 * Extract level progression table
 */
function extractLevelTable(
  tokens: Token[],
): Map<number, Partial<LevelProgression>> | null {
  for (const token of tokens) {
    if (token.type === "table") {
      const table = token as Tokens.Table;

      // Find the "Level" column
      const levelColIndex = table.header.findIndex((h) =>
        h.text.toLowerCase().includes("level"),
      );

      if (levelColIndex === -1) continue;

      const levels = new Map<number, Partial<LevelProgression>>();

      // Check if first row is a multi-row header (spell slot numbers)
      // This happens when header has empty columns and first row has values like "**1**", "**2**", etc.
      let spellSlotHeaders: Map<number, number> | null = null;
      let startRowIndex = 0;

      if (table.rows.length > 0) {
        const firstRow = table.rows[0];
        const firstRowLevelText = firstRow[levelColIndex]?.text.trim();

        // If first row's level column is empty or not a number, it's likely a header row
        if (!firstRowLevelText || isNaN(parseInt(firstRowLevelText))) {
          spellSlotHeaders = new Map();

          // Extract spell slot levels from this row
          for (let i = 0; i < firstRow.length; i++) {
            const cellText = firstRow[i]?.text.trim() || "";
            // Look for patterns like "**1**", "**2**", "1", "2", etc.
            const slotLevelMatch = cellText.match(/\*?\*?(\d)\*?\*?/);
            if (slotLevelMatch) {
              const slotLevel = parseInt(slotLevelMatch[1]);
              if (slotLevel >= 1 && slotLevel <= 9) {
                spellSlotHeaders.set(i, slotLevel);
              }
            }
          }

          // Skip this header row
          startRowIndex = 1;
        }
      }

      for (let rowIdx = startRowIndex; rowIdx < table.rows.length; rowIdx++) {
        const row = table.rows[rowIdx];
        const levelText = row[levelColIndex]?.text.trim();
        const level = parseInt(levelText);

        if (isNaN(level) || level < 1 || level > 20) continue;

        const levelData: Partial<LevelProgression> = {
          level,
          featuresGained: [],
          allFeatures: [],
          metrics: {},
        };

        // Parse proficiency bonus
        const profBonusIdx = table.header.findIndex(
          (h) =>
            h.text.toLowerCase().includes("proficiency") ||
            h.text.toLowerCase().includes("prof"),
        );
        if (profBonusIdx !== -1) {
          const bonusText = row[profBonusIdx]?.text.trim();
          levelData.proficiencyBonus =
            parseInt(bonusText.replace("+", "")) || 2;
        }

        // Parse class features
        const featuresIdx = table.header.findIndex(
          (h) =>
            h.text.toLowerCase().includes("class feature") ||
            h.text.toLowerCase().includes("features"),
        );
        if (featuresIdx !== -1) {
          const featuresText = row[featuresIdx]?.text.trim();
          if (featuresText && featuresText !== "—") {
            // Features are comma-separated
            const featureNames = featuresText
              .split(",")
              .map((f) => f.trim())
              .filter((f) => f && f !== "—")
              .filter((f) => {
                // Filter out generic placeholders that aren't real features
                const normalized = f.toLowerCase();
                return (
                  !normalized.includes("ability score improvement") &&
                  !normalized.includes("epic boon") &&
                  normalized !== "subclass feature"
                );
              });

            // We'll populate full Feature objects later
            levelData.featuresGained = featureNames.map((name) => ({
              name: normalizeFeatureName(name),
              level,
              description: "", // Will be filled later
              isSubclassFeature: name.toLowerCase().includes("subclass"),
            }));
          }
        }

        // Parse class-specific metrics (all other columns)
        const spellSlots: Record<number, number> = {};

        for (let i = 0; i < table.header.length; i++) {
          const headerText = table.header[i].text.trim();

          // Skip known columns
          if (i === levelColIndex || i === profBonusIdx || i === featuresIdx)
            continue;

          const cellValue = row[i]?.text.trim() || "";

          // Skip null/empty values
          if (!cellValue || cellValue === "—" || cellValue === "-") continue;

          // Check if this column is a spell slot (from multi-row header)
          if (spellSlotHeaders && spellSlotHeaders.has(i)) {
            const slotLevel = spellSlotHeaders.get(i)!;
            const slotCount = parseInt(cellValue);
            if (!isNaN(slotCount)) {
              spellSlots[slotLevel] = slotCount;
            }
            continue;
          }

          // Check if this is a spell slot column (from header text)
          const slotMatch = headerText.match(/(?:slot\s*)?([1-9])/i);
          if (slotMatch) {
            const slotLevel = parseInt(slotMatch[1]);
            const slotCount = parseInt(cellValue);
            if (!isNaN(slotCount)) {
              spellSlots[slotLevel] = slotCount;
            }
            continue;
          }

          // Skip empty header columns
          if (!headerText) continue;

          // Convert header to camelCase key for other metrics
          const key = headerText
            .toLowerCase()
            .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
            .replace(/[^a-z0-9]/gi, "");

          // Skip if key is empty after cleaning
          if (!key) continue;

          // Try to parse as number, otherwise keep as string
          const numValue = parseInt(cellValue);
          levelData.metrics![key] = isNaN(numValue) ? cellValue : numValue;
        }

        // Add spellSlots object only if it has entries
        if (Object.keys(spellSlots).length > 0) {
          levelData.metrics!.spellSlots = spellSlots;
        }

        levels.set(level, levelData);
      }

      return levels;
    }
  }

  return null;
}

/**
 * Extract all features with descriptions
 */
function extractFeatures(tokens: Token[], className: string): Feature[] {
  const features: Feature[] = [];
  let currentFeature: Partial<Feature> | null = null;
  let currentLevel = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading" && (token.depth === 3 || token.depth === 4)) {
      const heading = token as Tokens.Heading;

      // Save previous feature
      if (currentFeature && currentFeature.name && currentFeature.description) {
        features.push(currentFeature as Feature);
      }

      // Check if this is a feature heading "Level X: Feature Name"
      const levelMatch = heading.text.match(/Level\s+(\d+):\s*(.+)/i);
      if (levelMatch) {
        currentLevel = parseInt(levelMatch[1]);
        const featureName = normalizeFeatureName(levelMatch[2]);

        currentFeature = {
          name: featureName,
          level: currentLevel,
          description: "",
          isSubclassFeature: false,
        };
      } else {
        currentFeature = null;
      }
    } else if (currentFeature && token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      if (currentFeature.description) {
        currentFeature.description += "\n\n" + para.text;
      } else {
        currentFeature.description = para.text;
      }
    } else if (currentFeature && token.type === "list") {
      const list = token as Tokens.List;
      for (const item of list.items) {
        currentFeature.description += "\n• " + item.text;
      }
    }
  }

  // Save last feature
  if (currentFeature && currentFeature.name && currentFeature.description) {
    features.push(currentFeature as Feature);
  }

  return features;
}

/**
 * Extract subclass information
 */
function extractSubclass(
  tokens: Token[],
  className: string,
): SubclassInfo | undefined {
  let subclassName = "";
  let subclassDescription = "";
  const subclassFeatures: Feature[] = [];
  let inSubclassSection = false;
  let currentFeature: Partial<Feature> | null = null;

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 1) {
      const heading = token as Tokens.Heading;

      // Pattern: "Fighter Subclass: Champion"
      const subclassMatch = heading.text.match(
        new RegExp(`${className}\\s+Subclass:\\s*(.+)`, "i"),
      );
      if (subclassMatch) {
        subclassName = subclassMatch[1].trim();
        inSubclassSection = true;
        continue;
      }
    }

    if (inSubclassSection) {
      if (token.type === "heading" && token.depth === 3) {
        const heading = token as Tokens.Heading;

        // Save previous feature
        if (
          currentFeature &&
          currentFeature.name &&
          currentFeature.description
        ) {
          subclassFeatures.push(currentFeature as Feature);
        }

        // New subclass feature "Level X: Feature Name"
        const levelMatch = heading.text.match(/Level\s+(\d+):\s*(.+)/i);
        if (levelMatch) {
          currentFeature = {
            name: normalizeFeatureName(levelMatch[2]),
            level: parseInt(levelMatch[1]),
            description: "",
            isSubclassFeature: true,
          };
        }
      } else if (currentFeature && token.type === "paragraph") {
        const para = token as Tokens.Paragraph;
        if (!subclassDescription && !currentFeature.name) {
          // First paragraph is description
          subclassDescription = para.text;
        } else if (currentFeature.description) {
          currentFeature.description += "\n\n" + para.text;
        } else {
          currentFeature.description = para.text;
        }
      } else if (currentFeature && token.type === "list") {
        const list = token as Tokens.List;
        for (const item of list.items) {
          currentFeature.description += "\n• " + item.text;
        }
      }

      // Check if we've left subclass section
      if (token.type === "heading" && token.depth === 2) {
        break;
      }
    }
  }

  // Save last feature
  if (currentFeature && currentFeature.name && currentFeature.description) {
    subclassFeatures.push(currentFeature as Feature);
  }

  if (subclassName && subclassFeatures.length > 0) {
    const featureLevels = Array.from(
      new Set(subclassFeatures.map((f) => f.level)),
    ).sort((a, b) => a - b);

    return {
      name: subclassName,
      gainedAtLevel: 3, // Most D&D 5e classes get subclass at 3
      description: subclassDescription,
      featureLevels,
      features: subclassFeatures,
    };
  }

  return undefined;
}

/**
 * Build cumulative feature lists
 */
function buildCumulativeFeatures(progression: LevelProgression[]): void {
  const allFeatures: string[] = [];

  for (const level of progression) {
    for (const feature of level.featuresGained) {
      if (!allFeatures.includes(feature.name)) {
        allFeatures.push(feature.name);
      }
    }
    level.allFeatures = [...allFeatures];
  }
}

/**
 * Detect metric changes
 */
function detectMetricChanges(progression: LevelProgression[]): void {
  for (let i = 1; i < progression.length; i++) {
    const current = progression[i];
    const previous = progression[i - 1];
    const changed: string[] = [];

    for (const key in current.metrics) {
      if (current.metrics[key] !== previous.metrics[key]) {
        changed.push(key);
      }
    }

    current.metricsChanged = changed;
  }
}

/**
 * Parse a single class from its tokens
 */
function parseClass(
  className: string,
  tokens: Token[],
  fileName: string,
): ClassData | null {
  console.log(`  Parsing ${className}...`);

  // Extract core traits
  const coreTraits = parseCoreTraitsTable(tokens);
  if (!coreTraits) {
    console.log(`    ⚠ Failed to parse core traits for ${className}`);
    return null;
  }

  // Extract starting equipment
  const startingEquipment = parseStartingEquipment(tokens);

  // Extract multiclass info
  const multiclass = parseMulticlass(tokens);

  // Extract level progression table
  const levelTable = extractLevelTable(tokens);
  if (!levelTable) {
    console.log(`    ⚠ Failed to parse level table for ${className}`);
    return null;
  }

  // Extract all features with descriptions
  const allFeatures = extractFeatures(tokens, className);

  // Match features to level progression
  const progression: LevelProgression[] = [];
  for (let lvl = 1; lvl <= 20; lvl++) {
    const levelData = levelTable.get(lvl);
    if (!levelData) continue;

    // Match feature descriptions
    for (const feature of levelData.featuresGained || []) {
      const fullFeature = allFeatures.find((f) => f.name === feature.name);
      if (fullFeature) {
        feature.description = fullFeature.description;
      }
    }

    progression.push(levelData as LevelProgression);
  }

  // Build cumulative features
  buildCumulativeFeatures(progression);

  // Detect metric changes
  detectMetricChanges(progression);

  // Extract feature levels
  const featureLevels = progression
    .filter((p) => p.featuresGained.length > 0)
    .map((p) => p.level);

  // Extract subclass
  const subclasses: SubclassInfo[] = [];
  const subclass = extractSubclass(tokens, className);
  if (subclass) {
    subclasses.push(subclass);
  }

  const classData: ClassData = {
    name: className,
    coreTraits: coreTraits as ClassData["coreTraits"],
    startingEquipment,
    multiclass,
    progression,
    features: allFeatures.filter((f) => {
      // Filter out subclass features and generic placeholders
      if (f.isSubclassFeature) return false;
      const normalized = f.name.toLowerCase();
      return (
        !normalized.includes("ability score improvement") &&
        !normalized.includes("epic boon") &&
        normalized !== "subclass feature"
      );
    }),
    featureLevels,
    subclasses: subclasses.length > 0 ? subclasses : undefined,
    source: {
      file: fileName,
    },
  };

  console.log(
    `    ✓ Parsed ${className} (${progression.length} levels, ${allFeatures.length} features)`,
  );
  return classData;
}

/**
 * Main entry point
 */
export async function parseClasses(inputDir: string, outputDir: string) {
  console.log("\nParsing classes from normalized files...");
  await ensureDir(outputDir);

  let totalClasses = 0;

  for (const { file, classes } of classFiles) {
    const filePath = `${inputDir}/${file}`;
    console.log(`\nProcessing ${file}...`);

    const content = await Deno.readTextFile(filePath);
    const tokens = marked.lexer(content);

    const classSections = extractClassSections(tokens);

    for (const className of classes) {
      const classTokens = classSections.get(className);
      if (!classTokens) {
        console.log(`  ⚠ Could not find ${className} in ${file}`);
        continue;
      }

      const classData = parseClass(className, classTokens, file);
      if (classData) {
        const outputFile = `${outputDir}/${className.toLowerCase()}.json`;
        await Deno.writeTextFile(
          outputFile,
          JSON.stringify(classData, null, 2),
        );
        totalClasses++;
      }
    }
  }

  console.log(`\n✓ Parsed ${totalClasses} classes`);
}

// For direct execution
if (import.meta.main) {
  const basePath = Deno.cwd();
  const normalizedDir = `${basePath}/srd_reference/normalized`;
  const outputDir = `${basePath}/data/classes`;

  await parseClasses(normalizedDir, outputDir);
}
