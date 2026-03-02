/**
 * AST-based Class Parser using marked.js
 *
 * Uses proper markdown parsing instead of regex/string manipulation
 * for more accurate and reliable extraction.
 */

import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type { ClassData } from "../../agent/types/class-types.ts";

/**
 * Parse all classes from normalized SRD markdown files
 */
export async function parseClasses(
  inputDir: string,
  outputDir: string,
): Promise<void> {
  const classFiles = [
    "DND5eSRD_019-035.md",
    "DND5eSRD_036-046.md",
    "DND5eSRD_047-063.md",
    "DND5eSRD_064-076.md",
    "DND5eSRD_077-086.md",
  ];

  let totalClasses = 0;

  for (const fileName of classFiles) {
    const filePath = `${inputDir}/${fileName}`;
    try {
      const content = await Deno.readTextFile(filePath);
      const tokens = marked.lexer(content);

      // Find all class sections
      const classes = extractClassSections(tokens);

      for (const [className, classTokens] of classes) {
        const classData = parseClassFromTokens(
          className,
          classTokens,
          fileName,
        );
        if (classData) {
          const outputPath = `${outputDir}/${className.toLowerCase()}.json`;
          await Deno.writeTextFile(
            outputPath,
            JSON.stringify(classData, null, 2),
          );
          totalClasses++;
          console.log(`  Parsed class: ${className}`);
        }
      }
    } catch (error) {
      console.error(`  Warning: Could not process ${fileName}: ${error}`);
    }
  }

  console.log(`  Total classes processed: ${totalClasses}`);
}

/**
 * Extract class sections from token stream
 * Returns Map of className -> tokens for that class
 */
function extractClassSections(tokens: Token[]): Map<string, Token[]> {
  const classes = new Map<string, Token[]>();
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

  let currentClass: string | null = null;
  let currentTokens: Token[] = [];

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 2) {
      const headerText = token.text;

      // Check if this is a class header (but not JUST a subclass header)
      const matchedClass = classNames.find((name) => {
        // Exact match
        if (headerText === name) return true;
        // Starts with class name, but exclude subclass-only sections
        if (headerText.startsWith(`${name} `)) {
          if (headerText.startsWith(`${name} Subclass:`)) return false;
          return true;
        }
        if (headerText.startsWith(`${name}:`)) return true;
        return false;
      });

      if (matchedClass) {
        // Save previous class if exists
        if (currentClass && currentTokens.length > 0) {
          classes.set(currentClass, currentTokens);
        }

        // Check if this is a different class (stop collecting for previous class)
        if (matchedClass !== currentClass) {
          currentClass = matchedClass;
          currentTokens = [token];
        } else {
          // Same class, continue collecting
          currentTokens.push(token);
        }
      } else if (currentClass) {
        // This is a related section for current class, keep collecting
        currentTokens.push(token);
      }
    } else if (currentClass) {
      currentTokens.push(token);
    }
  }

  // Save final class
  if (currentClass && currentTokens.length > 0) {
    classes.set(currentClass, currentTokens);
  }

  return classes;
}

/**
 * Parse a class from its token stream
 */
function parseClassFromTokens(
  className: string,
  tokens: Token[],
  fileName: string,
): ClassData | null {
  try {
    // Extract core traits
    const coreTraits = extractCoreTraits(tokens);

    // Extract level progression table
    const levels = extractLevelTable(tokens);

    // Extract features
    const features = extractFeatures(tokens);

    return {
      name: className,
      primaryAbility: coreTraits.primaryAbility as any,
      hitDie: coreTraits.hitDie,
      savingThrows: coreTraits.savingThrows as any,
      skillChoices: coreTraits.skillChoices,
      armorProficiencies: coreTraits.armorProficiencies as any,
      weaponProficiencies: coreTraits.weaponProficiencies as any,
      startingEquipment: coreTraits.startingEquipment,
      levels,
      features,
      source: {
        file: fileName,
        line: 0,
      },
    };
  } catch (error) {
    console.error(`  Error parsing class ${className}: ${error}`);
    return null;
  }
}

/**
 * Extract core traits from blockquote or table
 */
function extractCoreTraits(tokens: Token[]) {
  // Look for blockquote with Core Traits
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "blockquote") {
      // Parse blockquote tokens
      const bqTokens = (token as Tokens.Blockquote).tokens;
      return parseCoreTraitsFromBlockquote(bqTokens);
    }

    // Look for table with "Core" and "Traits" in header or first cell
    if (token.type === "table") {
      const table = token as Tokens.Table;
      if (
        table.header.some(
          (h) => h.text.includes("Core") && h.text.includes("Traits"),
        )
      ) {
        return parseCoreTraitsFromTable(table);
      }
      // Check first row first cell
      if (
        table.rows.length > 0 &&
        table.rows[0][0]?.text.includes("Primary Ability")
      ) {
        return parseCoreTraitsFromTable(table);
      }
    }
  }

  // Return defaults if not found
  return {
    primaryAbility: "Unknown",
    hitDie: "d8",
    savingThrows: [],
    skillChoices: { count: 0, options: [] },
    armorProficiencies: [],
    weaponProficiencies: [],
    startingEquipment: [],
  };
}

/**
 * Parse core traits from blockquote tokens
 * Handles nested token structures from marked.js
 */
function parseCoreTraitsFromBlockquote(tokens: Token[]) {
  const traits: Record<string, string> = {};
  let currentField = "";

  for (const token of tokens) {
    if (token.type === "paragraph") {
      const paraTokens = (token as Tokens.Paragraph).tokens;

      // Walk through inline tokens to find strong (bold) text
      for (let i = 0; i < paraTokens.length; i++) {
        const inlineToken = paraTokens[i];

        if (inlineToken.type === "strong") {
          // This is a field name
          currentField = inlineToken.text.trim();

          // Check if there's text after this strong token in the same paragraph
          let valueText = "";
          for (let j = i + 1; j < paraTokens.length; j++) {
            if (paraTokens[j].type === "text") {
              valueText += paraTokens[j].text;
            } else if (paraTokens[j].type === "strong") {
              break; // Next field starts
            }
          }

          valueText = valueText.trim().replace(/^\n+/, "");
          if (valueText) {
            traits[currentField] = valueText;
          }
        }
      }
    }
  }

  return parseTraitsMap(traits);
}

/**
 * Parse core traits from table
 */
function parseCoreTraitsFromTable(table: Tokens.Table) {
  const traits: Record<string, string> = {};

  for (const row of table.rows) {
    if (row.length >= 2) {
      const label = row[0].text.replace(/\*\*/g, "").trim();
      const value = row[1].text.trim();
      if (label && value) {
        traits[label] = value;
      }
    }
  }

  return parseTraitsMap(traits);
}

/**
 * Convert trait map to structured object
 */
function parseTraitsMap(traits: Record<string, string>) {
  const primaryAbility = traits["Primary Ability"] || "Unknown";
  const hitDieRaw = traits["Hit Point Die"] || traits["Hit Die"] || "d8";
  const hitDie = (hitDieRaw.match(/[dD]\d+/) || ["d8"])[0];

  const savingThrows = (traits["Saving Throw Proficiencies"] || "")
    .split(/\s+and\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const skillRaw = traits["Skill Proficiencies"] || "";
  const skillMatch = skillRaw.match(/Choose\s+(\d+)\s*[:from]*\s*(.+?)$/i);
  const skillChoices = skillMatch
    ? {
        count: parseInt(skillMatch[1]),
        options: skillMatch[2]
          .split(/,\s*|(?:\s+and\s+)|(?:\s+or\s+)/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      }
    : { count: 0, options: [] };

  const armorRaw = traits["Armor Training"] || "";
  const armorProficiencies = armorRaw
    ? armorRaw
        .split(/,\s*|(?:\s+and\s+)/)
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
    : [];

  const weaponRaw = traits["Weapon Proficiencies"] || "";
  const weaponProficiencies = weaponRaw
    ? weaponRaw
        .split(/,\s*|(?:\s+and\s+)/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)
    : [];

  const equipmentRaw = traits["Starting Equipment"] || "";
  const startingEquipment = equipmentRaw
    ? parseStartingEquipment(equipmentRaw)
    : [];

  return {
    primaryAbility,
    hitDie,
    savingThrows,
    skillChoices,
    armorProficiencies,
    weaponProficiencies,
    startingEquipment,
  };
}

/**
 * Parse starting equipment
 */
function parseStartingEquipment(equipStr: string) {
  const options: Array<{ option: string; items?: string[]; gold?: number }> =
    [];
  const optionMatches = Array.from(
    equipStr.matchAll(/\(([A-C])\)\s*([^;()]+?)(?:;|,\s*or|$)/gi),
  );

  if (optionMatches.length === 0) {
    return [{ option: "A", items: [equipStr.trim()] }];
  }

  for (const match of optionMatches) {
    const option = match[1].toUpperCase();
    const itemsStr = match[2].trim();
    const goldMatch = itemsStr.match(/^(\d+)\s*(?:GP|gp)$/);

    if (goldMatch) {
      options.push({ option, gold: parseInt(goldMatch[1]) });
    } else {
      const items = itemsStr
        .split(/,\s*|(?:\s+and\s+)/)
        .map((i) => i.trim())
        .filter((i) => i.length > 0);
      options.push({ option, items });
    }
  }

  return options;
}

/**
 * Extract level progression table
 */
function extractLevelTable(tokens: Token[]) {
  const levels: ClassData["levels"] = {};

  for (const token of tokens) {
    if (token.type === "table") {
      const table = token as Tokens.Table;

      // Check if this is a level progression table (has "Level" column)
      const levelColIndex = table.header.findIndex((h) => h.text === "Level");
      if (levelColIndex === -1) continue;

      // Parse each row
      for (const row of table.rows) {
        const level = row[levelColIndex]?.text;
        if (!level || isNaN(parseInt(level))) continue;

        const levelData = parseLevelRow(table.header, row);
        if (levelData) {
          levels[level] = levelData;
        }
      }

      // Found the table, stop looking
      if (Object.keys(levels).length > 0) break;
    }
  }

  return levels;
}

/**
 * Parse a single level row from the table
 */
function parseLevelRow(headers: Tokens.TableCell[], row: Tokens.TableCell[]) {
  let proficiencyBonus = 2;
  const classFeatures: string[] = [];
  const classMetrics: Record<string, number | string> = {};

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].text;
    const cell = row[i]?.text || "";

    if (header === "Level") continue;

    if (
      header === "Prof. Bonus" ||
      header === "Proficiency Bonus" ||
      header === "Bonus"
    ) {
      proficiencyBonus = parseInt(cell.replace("+", "")) || 2;
    } else if (header === "Class Features" || header === "Features") {
      const features = cell
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0 && f !== "—");
      classFeatures.push(...features);
    } else {
      // This is a class metric
      const key = header
        .toLowerCase()
        .replace(/\s+(.)/g, (_, c) => c.toUpperCase());
      const numValue = parseInt(cell);
      classMetrics[key] = isNaN(numValue) ? cell : numValue;
    }
  }

  const result: ClassData["levels"]["1"] = {
    proficiencyBonus,
    classFeatures,
  };

  if (Object.keys(classMetrics).length > 0) {
    result.classMetrics = classMetrics;
  }

  return result;
}

/**
 * Extract features with descriptions
 */
function extractFeatures(tokens: Token[]) {
  const features: ClassData["features"] = {};

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading" && (token.depth === 3 || token.depth === 4)) {
      const match = token.text.match(/Level\s+(\d+):\s+(.+)/);
      if (match) {
        const level = parseInt(match[1]);
        const name = match[2].trim();

        // Collect description from following paragraphs
        const description = collectDescription(tokens, i + 1);

        features[name] = {
          level,
          name,
          description: description.substring(0, 1000),
        };
      }
    }
  }

  return features;
}

/**
 * Collect description text from following tokens
 */
function collectDescription(tokens: Token[], startIndex: number): string {
  const parts: string[] = [];

  for (let i = startIndex; i < tokens.length && i < startIndex + 5; i++) {
    const token = tokens[i];

    if (token.type === "heading") break; // Stop at next heading
    if (token.type === "paragraph") {
      parts.push(token.text);
    }
    if (token.type === "list") {
      const list = token as Tokens.List;
      for (const item of list.items) {
        parts.push(`- ${item.text}`);
      }
    }
  }

  return parts.join("\n\n");
}
