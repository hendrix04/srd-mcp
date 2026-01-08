import type { ClassData } from "../../src/types/class-types.ts";
import {
  extractSections,
  parseMarkdownTable,
} from "../utils/markdown-utils.ts";

/**
 * Parse all classes from the SRD markdown files
 */
export async function parseClasses(
  inputDir: string,
  outputDir: string,
): Promise<void> {
  // Classes are in specific files - no hardcoded class names, we'll detect them dynamically
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

      // Dynamically extract class names from the file (both # and ## headers)
      const classNames = detectClassNamesInFile(content);

      for (const className of classNames) {
        const classData = parseClass(content, className, fileName);
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
 * Detect class names in a file by looking for headers that are known D&D classes
 * Handles both # and ## header levels
 */
function detectClassNamesInFile(markdown: string): string[] {
  const classNames: string[] = [];
  const seenNames = new Set<string>();

  // Look for both level 1 and level 2 headers
  const headerRegex = /^(#{1,2})\s+(.+?)(?:\n|$)/gm;
  let match;

  while ((match = headerRegex.exec(markdown)) !== null) {
    const headerLevel = match[1].length;
    const headerText = match[2].trim();

    // Only include if it's a known class name and we haven't seen it already in this file
    if (isLikelyClassName(headerText) && !seenNames.has(headerText)) {
      classNames.push(headerText);
      seenNames.add(headerText);
    }
  }

  return classNames;
}

/**
 * Check if a header text is likely a D&D class name
 * Only match exact class names, not composite headers like "Core Fighter Traits"
 */
function isLikelyClassName(text: string): boolean {
  const knownClasses = [
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
  // Only match if text exactly equals a class name (not "Core Fighter Traits" etc)
  return (
    knownClasses.includes(text) &&
    !text.includes("Traits") &&
    !text.includes("Features")
  );
}

/**
 * Interface for core traits extracted from class description
 */
interface CoreTraits {
  primaryAbility: string;
  hitDie: string;
  savingThrows: string[];
  skillChoices: { count: number; options: string[] };
  armorProficiencies: string[];
  weaponProficiencies: string[];
  startingEquipment: Array<{ option: string; items?: string[]; gold?: number }>;
}

/**
 * Detect if core traits are in blockquote format (>) or table format (|)
 */
function detectCoreTraitsFormat(classSection: string): "blockquote" | "table" {
  // Check for blockquote format: "> **Core ClassName Traits**" or "> **Primary Ability**"
  if (/^>\s*\*\*(?:Core|Primary)/m.test(classSection)) {
    return "blockquote";
  }
  // Check for table format: "| Core ... Traits |" or "| **Primary Ability** |"
  if (/\|\s*(?:Core|.*Traits|.*Ability)/m.test(classSection)) {
    return "table";
  }
  // Default to blockquote as it's slightly more common
  return "blockquote";
}

/**
 * Extract core traits from blockquote format
 */
function extractCoreTraitsFromBlockquote(classSection: string): CoreTraits {
  // Match blockquote lines: "> **Field**\n> Value" or "> **Field:** Value"
  const lines = classSection.split("\n");
  const traits: Record<string, string> = {};
  let currentField = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop at next section header
    if (line.startsWith("#")) {
      break;
    }

    if (!line.startsWith(">")) {
      continue;
    }

    const content = line.replace(/^>\s*/, "").trim();

    // Check if this is a field header (bold text)
    const fieldMatch = content.match(/^\*\*([^*]+)\*\*\s*(?::(.*))?$/);
    if (fieldMatch) {
      currentField = fieldMatch[1].trim();
      if (fieldMatch[2]) {
        // Value is on same line: "> **Field:** Value"
        traits[currentField] = fieldMatch[2].trim();
      }
    } else if (currentField && content) {
      // Value is on next line: "> Value"
      if (traits[currentField]) {
        traits[currentField] += " " + content;
      } else {
        traits[currentField] = content;
      }
    }
  }

  return parseTraitsFromMap(traits);
}

/**
 * Extract core traits from table format
 */
function extractCoreTraitsFromTable(classSection: string): CoreTraits {
  // Find the core traits table - look for table starting with | Core or | Trait
  // and containing the trait rows
  const tableLines = classSection.split("\n");
  let tableStart = -1;
  let tableEnd = -1;

  // Find the start of the traits table
  // Look for: 1) "Core ... Traits" header, 2) "Trait | Description" pattern, 3) Just a table with "**Primary Ability**" in first few rows
  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i];

    if (!line.includes("|")) {
      continue;
    }

    // Check for "Core ... Traits" header
    if (line.includes("Core") && line.includes("Traits")) {
      tableStart = i;
      break;
    }

    // Check for "Trait | Description" pattern
    if (line.includes("Trait") && line.includes("Description")) {
      tableStart = i;
      break;
    }

    // Check for empty header table (| | |) followed by separator and then **Primary Ability**
    if (
      line.match(/^\|\s*\|\s*\|?$/) &&
      i + 2 < tableLines.length &&
      tableLines[i + 2].includes("**Primary Ability**")
    ) {
      tableStart = i;
      break;
    }
  }

  if (tableStart === -1) {
    return getEmptyCoreTraits();
  }

  // Find the end of the table (blank line or next section)
  for (let i = tableStart + 1; i < tableLines.length; i++) {
    const line = tableLines[i];
    if (
      line.trim() === "" ||
      line.startsWith("#") ||
      (line.startsWith(">") && !line.includes("|"))
    ) {
      tableEnd = i;
      break;
    }
  }

  if (tableEnd === -1) {
    tableEnd = tableLines.length;
  }

  // Extract table rows directly (skip header and separator line)
  const traits: Record<string, string> = {};
  const rows = tableLines.slice(tableStart + 2, tableEnd);

  for (const row of rows) {
    if (!row.includes("|") || row.trim() === "") {
      continue;
    }

    // Split the row by pipes and filter out empty cells
    const cells = row
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length >= 2) {
      const label = cells[0];
      const value = cells[1];

      // The label should be in bold format like "**Primary Ability**"
      if (label.includes("**")) {
        const cleanLabel = label.replace(/\*\*/g, "").trim();
        if (cleanLabel.length > 0) {
          const standardLabel = normalizeTraitLabel(cleanLabel);
          traits[standardLabel] = value;
        }
      }
    }
  }

  return parseTraitsFromMap(traits);
}

/**
 * Normalize trait label to standard naming
 */
function normalizeTraitLabel(label: string): string {
  if (label.includes("Primary")) return "Primary Ability";
  if (label.includes("Hit Point") || label.includes("Hit Die"))
    return "Hit Point Die";
  if (label.includes("Saving")) return "Saving Throw Proficiencies";
  if (label.includes("Skill")) return "Skill Proficiencies";
  if (label.includes("Armor") || label.includes("Training"))
    return "Armor Training";
  if (label.includes("Weapon")) return "Weapon Proficiencies";
  if (label.includes("Starting") || label.includes("Equipment"))
    return "Starting Equipment";
  return label;
}

/**
 * Parse traits from a normalized map of field -> value
 */
function parseTraitsFromMap(traits: Record<string, string>): CoreTraits {
  const primaryAbility = traits["Primary Ability"] || "Unknown";

  const hitDieRaw = traits["Hit Point Die"] || "d8";
  const hitDie = (hitDieRaw.match(/[dD]\d+/) || ["d8"])[0];

  const savingThrowsRaw = traits["Saving Throw Proficiencies"] || "";
  const savingThrows = savingThrowsRaw
    ? savingThrowsRaw.split(/\s+and\s+/).map((s) => s.trim())
    : [];

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
 * Parse starting equipment into structured options
 */
function parseStartingEquipment(
  equipStr: string,
): Array<{ option: string; items?: string[]; gold?: number }> {
  const options: Array<{ option: string; items?: string[]; gold?: number }> =
    [];

  // Pattern: "Choose A or B: (A) items; or (B) items" or "(A) items, (B) items, or (C) GP"
  const optionMatches = Array.from(
    equipStr.matchAll(/\(([A-C])\)\s*([^;()]+?)(?:;|,\s*or|$)/gi),
  );

  if (optionMatches.length === 0) {
    // Fallback: treat entire string as option A
    return [{ option: "A", items: [equipStr.trim()] }];
  }

  for (const match of optionMatches) {
    const option = match[1].toUpperCase();
    const itemsStr = match[2].trim();

    // Check if it's a gold option
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
 * Get empty core traits with safe defaults
 */
function getEmptyCoreTraits(): CoreTraits {
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
 * Extract core traits - automatically detects format
 */
function extractCoreTraits(
  classSection: string,
  className: string,
): CoreTraits {
  const format = detectCoreTraitsFormat(classSection);

  if (format === "blockquote") {
    return extractCoreTraitsFromBlockquote(classSection);
  } else {
    return extractCoreTraitsFromTable(classSection);
  }
}

/**
 * Extract all content related to a class
 * This includes multiple sections like "## Cleric", "## Cleric Class Features",
 * "## Cleric Spell List", "## Cleric Subclass: X"
 */
function extractFullClassContent(
  markdown: string,
  className: string,
): string | null {
  const lines = markdown.split("\n");
  const classLines: string[] = [];
  let inClassContent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a level 2 header
    if (line.startsWith("## ")) {
      const headerText = line.substring(3).trim();

      // Check if this header belongs to our class
      if (
        headerText === className ||
        headerText.startsWith(`${className} `) ||
        headerText.startsWith(`${className}:`)
      ) {
        inClassContent = true;
        classLines.push(line);
      } else if (inClassContent) {
        // This is a different class or section - stop collecting
        // But only if it's not a sub-section of our class
        const otherClasses = [
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
        ].filter((c) => c !== className);

        // Check if this header starts a different class
        const isOtherClass = otherClasses.some(
          (c) =>
            headerText === c ||
            headerText.startsWith(`${c} `) ||
            headerText.startsWith(`${c}:`),
        );

        if (isOtherClass) {
          break; // Stop - we've reached another class
        }
        // Otherwise, this might be unrelated content, skip it
        inClassContent = false;
      }
    } else if (inClassContent) {
      classLines.push(line);
    }
  }

  if (classLines.length === 0) {
    return null;
  }

  return classLines.join("\n");
}

/**
 * Parse a single class from markdown
 */
function parseClass(
  markdown: string,
  className: string,
  fileName: string,
): ClassData | null {
  // Extract all content for this class (spans multiple ## sections)
  const classSection = extractFullClassContent(markdown, className);

  if (!classSection) {
    console.error(`  Could not find section for class: ${className}`);
    return null;
  }

  try {
    // Detect if we're using blockquote or table format for core traits
    const coreTraits = extractCoreTraits(classSection, className);
    const {
      primaryAbility,
      hitDie,
      savingThrows,
      skillChoices,
      armorProficiencies,
      weaponProficiencies,
      startingEquipment,
    } = coreTraits;

    // Parse level progression table
    const levels = parseLevelTable(classSection);

    // Extract feature descriptions
    const features = parseFeatures(classSection);

    const classData: ClassData = {
      name: className,
      primaryAbility: primaryAbility as ClassData["primaryAbility"],
      hitDie,
      savingThrows: savingThrows as ClassData["savingThrows"],
      skillChoices,
      armorProficiencies: armorProficiencies as ClassData["armorProficiencies"],
      weaponProficiencies:
        weaponProficiencies as ClassData["weaponProficiencies"],
      startingEquipment,
      levels,
      features,
      source: {
        file: fileName,
        line: 0, // Would need to calculate actual line number
      },
    };

    return classData;
  } catch (error) {
    console.error(`  Error parsing class ${className}: ${error}`);
    return null;
  }
}

/**
 * Parse the level progression table
 * Separates class features from class-specific metrics
 * Handles both simple and complex table headers (e.g., Cleric has multi-row headers)
 */
function parseLevelTable(classSection: string): ClassData["levels"] {
  const levels: ClassData["levels"] = {};

  // Extract all table content from the section
  // Match: | ... | (table row) repeated
  const lines = classSection.split("\n");
  let tableStartIdx = -1;
  let tableEndIdx = -1;

  // Find the start of the level progression table
  // Look for a line containing "Level" and "Proficiency" or "Bonus"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("|") && line.includes("Level")) {
      // This might be a header row, but verify it's the actual header
      // by checking that the next non-empty lines look like a table
      tableStartIdx = i;
      break;
    }
  }

  if (tableStartIdx === -1) {
    return levels;
  }

  // Find the end of the table (non-pipe line or empty line)
  for (let i = tableStartIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("|") || line.trim() === "") {
      tableEndIdx = i;
      break;
    }
  }

  if (tableEndIdx === -1) {
    tableEndIdx = lines.length;
  }

  // Extract the table lines
  const tableLines = lines.slice(tableStartIdx, tableEndIdx);

  // Find the actual header row (should contain "**Level**" or just "Level")
  let headerRowIdx = -1;
  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i];
    // Skip alignment rows (contain :--- or similar)
    if (line.match(/\|\s*[:-]+\s*\|/)) {
      continue;
    }
    // This should be a header row
    if (line.includes("Level")) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return levels;
  }

  // Parse the header row to get column names
  const headerLine = tableLines[headerRowIdx];
  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter((h) => h.length > 0)
    .map((h) => h.replace(/\*\*/g, "")); // Remove bold markers

  // Parse data rows (skip header and alignment rows)
  for (let i = headerRowIdx + 1; i < tableLines.length; i++) {
    const line = tableLines[i];

    // Skip alignment rows and empty lines
    if (line.match(/\|\s*[:-]+\s*\|/) || !line.includes("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length < 2) {
      continue;
    }

    // Map cells to header columns
    const row: Record<string, string> = {};
    for (let j = 0; j < Math.min(headers.length, cells.length); j++) {
      row[headers[j]] = cells[j];
    }

    // Extract level data
    const level = row["Level"];
    if (!level) continue;

    const profBonus = row["Proficiency Bonus"] || row["Bonus"] || "+2";
    const proficiencyBonus = parseInt(profBonus.replace("+", ""));

    const featuresStr = row["Class Features"] || row["Features"] || "";
    const classFeatures = featuresStr
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    // Separate class-specific metrics from standard columns
    const classMetrics: Record<string, number | string> = {};

    for (const [key, value] of Object.entries(row)) {
      if (
        key !== "Level" &&
        key !== "Proficiency Bonus" &&
        key !== "Bonus" &&
        key !== "Class Features" &&
        key !== "Features"
      ) {
        // Try to parse as number
        const numValue = parseInt(value);
        // Normalize the key to camelCase
        const normalizedKey = normalizeMetricKey(key);
        classMetrics[normalizedKey] = isNaN(numValue) ? value : numValue;
      }
    }

    const levelData: ClassData["levels"]["1"] = {
      proficiencyBonus,
      classFeatures,
    };

    // Only add classMetrics if there are any
    if (Object.keys(classMetrics).length > 0) {
      levelData.classMetrics = classMetrics;
    }

    levels[level] = levelData;
  }

  return levels;
}

/**
 * Normalize metric column names to camelCase
 * e.g., "Rage Damage" -> "rageDamage", "Spell Slots" -> "spellSlots"
 */
function normalizeMetricKey(key: string): string {
  return key.toLowerCase().replace(/\s+(.)/g, (_, c) => c.toUpperCase());
}

/**
 * Parse class features with correct levels extracted from headers
 */
function parseFeatures(classSection: string): ClassData["features"] {
  const features: ClassData["features"] = {};

  // Match both level 3 (###) and level 4 (####) headers with "Level X:" pattern
  // Pattern: "### Level 1: Feature Name" or "#### Level 5: Feature Name"
  const featureRegex = /^(#{3,4})\s+Level\s+(\d+):\s+(.+)$/gm;
  let match;

  while ((match = featureRegex.exec(classSection)) !== null) {
    const headerLevel = match[1].length;
    const level = parseInt(match[2]);
    const featureName = match[3].trim();
    const startIndex = match.index + match[0].length;

    // Find the end of this feature (next header of same or higher level)
    let endIndex = classSection.length;
    const remainingText = classSection.substring(startIndex);
    const nextHeaderRegex = new RegExp(`^#{${headerLevel},}\\s`, "m");
    const nextHeaderMatch = nextHeaderRegex.exec(remainingText);
    if (nextHeaderMatch) {
      endIndex = startIndex + nextHeaderMatch.index;
    }

    const content = classSection.substring(startIndex, endIndex).trim();

    // Skip tables and non-feature sections
    if (content.includes("|") && content.includes("Level")) {
      continue;
    }

    // Clean description: remove multiple line breaks, truncate if too long
    const cleanedDescription = content
      .replace(/\n{3,}/g, "\n\n")
      .substring(0, 1000)
      .trim();
    const description =
      cleanedDescription.length > 1000
        ? cleanedDescription.substring(0, 1000) + "..."
        : cleanedDescription;

    features[featureName] = {
      level,
      name: featureName,
      description,
    };
  }

  return features;
}
