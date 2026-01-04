import type { ClassData } from "../../src/types/class-types.ts";
import { extractSections, parseMarkdownTable } from "../utils/markdown-utils.ts";

/**
 * Parse all classes from the SRD markdown files
 */
export async function parseClasses(inputDir: string, outputDir: string): Promise<void> {
  // Classes are in specific files
  const classFiles = [
    { file: "DND5eSRD_019-035.md", classes: ["Barbarian", "Bard"] },
    { file: "DND5eSRD_036-046.md", classes: ["Cleric", "Druid"] },
    { file: "DND5eSRD_047-063.md", classes: ["Fighter", "Monk", "Paladin", "Ranger"] },
    { file: "DND5eSRD_064-076.md", classes: ["Rogue", "Sorcerer", "Warlock"] },
    { file: "DND5eSRD_077-086.md", classes: ["Wizard"] },
  ];

  let totalClasses = 0;

  for (const { file, classes } of classFiles) {
    const filePath = `${inputDir}/${file}`;
    try {
      const content = await Deno.readTextFile(filePath);

      for (const className of classes) {
        const classData = parseClass(content, className, file);
        if (classData) {
          const outputPath = `${outputDir}/${className.toLowerCase()}.json`;
          await Deno.writeTextFile(outputPath, JSON.stringify(classData, null, 2));
          totalClasses++;
          console.log(`  Parsed class: ${className}`);
        }
      }
    } catch (error) {
      console.error(`  Warning: Could not process ${file}: ${error}`);
    }
  }

  console.log(`  Total classes processed: ${totalClasses}`);
}

/**
 * Parse a single class from markdown
 */
function parseClass(markdown: string, className: string, fileName: string): ClassData | null {
  // Find the class section (## ClassName)
  const sections = extractSections(markdown, 2);
  const classSection = sections.get(className);

  if (!classSection) {
    console.error(`  Could not find section for class: ${className}`);
    return null;
  }

  try {
    // Extract traits block (blockquote with class info)
    const traitsMatch = classSection.match(/^>\s*\*\*Primary Ability:\*\*\s*(.+)$/m);
    const primaryAbility = traitsMatch ? traitsMatch[1].trim() : "Unknown";

    const hitDieMatch = classSection.match(/\*\*Hit Point Die:\*\*\s*(.+?)(?=\n|,)/);
    const hitDie = hitDieMatch ? hitDieMatch[1].trim() : "d8";

    const savingThrowsMatch = classSection.match(/\*\*Saving Throw Proficiencies:\*\*\s*(.+?)(?=\n|,|\*\*)/);
    const savingThrows = savingThrowsMatch
      ? savingThrowsMatch[1].split(" and ").map((s) => s.trim())
      : [];

    // Extract skill proficiencies (e.g., "choose 2: Athletics, Intimidation, ...")
    const skillMatch = classSection.match(/\*\*Skill Proficiencies:\*\*\s*Choose\s+(\d+)\s+from\s+(.+?)(?=\n|\*\*)/i);
    const skillChoices = skillMatch
      ? {
          count: parseInt(skillMatch[1]),
          options: skillMatch[2].split(/,\s*(?:and\s+)?|(?:\s+and\s+)/).map((s) => s.trim()),
        }
      : { count: 0, options: [] };

    // Parse armor and weapon proficiencies
    const armorMatch = classSection.match(/\*\*Armor Training:\*\*\s*(.+?)(?=\n|\*\*)/);
    const armorProficiencies = armorMatch
      ? armorMatch[1].split(/,\s*(?:and\s+)?/).map((a) => a.trim())
      : [];

    const weaponMatch = classSection.match(/\*\*Weapon Proficiencies:\*\*\s*(.+?)(?=\n|\*\*)/);
    const weaponProficiencies = weaponMatch
      ? weaponMatch[1].split(/,\s*(?:and\s+)?/).map((w) => w.trim())
      : [];

    // Extract starting equipment (simplified - just raw text for now)
    const equipMatch = classSection.match(/\*\*Starting Equipment:\*\*\s*(.+?)(?=\n#|\n\*\*|$)/s);
    const startingEquipment = equipMatch
      ? [{ option: "A", items: [equipMatch[1].trim()] }]
      : [];

    // Parse level progression table
    const levels = parseLevelTable(classSection);

    // Extract features (simplified - we'll parse feature names only for now)
    const features = parseFeatures(classSection);

    const classData: ClassData = {
      name: className,
      primaryAbility: primaryAbility as ClassData["primaryAbility"],
      hitDie,
      savingThrows: savingThrows as ClassData["savingThrows"],
      skillChoices,
      armorProficiencies: armorProficiencies as ClassData["armorProficiencies"],
      weaponProficiencies: weaponProficiencies as ClassData["weaponProficiencies"],
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
 */
function parseLevelTable(classSection: string): ClassData["levels"] {
  const levels: ClassData["levels"] = {};

  // Find the level table (typically has "Level" and "Proficiency Bonus" headers)
  const tableMatch = classSection.match(/\|.*Level.*\|[\s\S]+?\n\n/);
  if (!tableMatch) {
    console.warn("  Could not find level table");
    return levels;
  }

  const tableData = parseMarkdownTable(tableMatch[0]);

  for (const row of tableData) {
    const level = row["Level"];
    if (!level) continue;

    const profBonus = row["Proficiency Bonus"] || row["Prof. Bonus"] || "+2";
    const proficiencyBonus = parseInt(profBonus.replace("+", ""));

    const featuresStr = row["Features"] || row["Class Features"] || "";
    const features = featuresStr.split(",").map((f) => f.trim()).filter((f) => f.length > 0);

    const levelData: any = {
      proficiencyBonus,
      features,
    };

    // Add any other columns as class-specific data
    for (const [key, value] of Object.entries(row)) {
      if (key !== "Level" && key !== "Proficiency Bonus" && key !== "Prof. Bonus" && key !== "Features" && key !== "Class Features") {
        // Try to parse as number
        const numValue = parseInt(value);
        levelData[key.replace(/\s+/g, "")] = isNaN(numValue) ? value : numValue;
      }
    }

    levels[level] = levelData;
  }

  return levels;
}

/**
 * Parse class features (simplified - just extracts feature names and descriptions)
 */
function parseFeatures(classSection: string): ClassData["features"] {
  const features: ClassData["features"] = {};

  // Extract level 3 headers as features (### Feature Name)
  const featureSections = extractSections(classSection, 3);

  for (const [featureName, content] of featureSections) {
    // Skip tables and non-feature sections
    if (content.includes("|") || featureName.toLowerCase().includes("table")) {
      continue;
    }

    features[featureName] = {
      level: 1, // Would need to parse level from context
      name: featureName,
      description: content.substring(0, 500).trim() + (content.length > 500 ? "..." : ""),
    };
  }

  return features;
}
