import type { Spell, SpellsByClass, SpellsByName } from "../../src/types/spell-types.ts";
import {
  cleanDescription,
  extractField,
  extractItalicHeader,
  extractSections,
  getLineNumber,
  isConcentration,
  isRitual,
  parseComponents,
  parseSpellHeader,
} from "../utils/markdown-utils.ts";

/**
 * Parse all spells from the SRD markdown files
 */
export async function parseSpells(inputDir: string, outputDir: string): Promise<void> {
  const spellsByName: SpellsByName = {};
  const spellsByClass: SpellsByClass = {};

  // Spell files span DND5eSRD_104-120.md through DND5eSRD_155-175.md
  const spellFiles = [
    "DND5eSRD_104-120.md",
    "DND5eSRD_121-137.md",
    "DND5eSRD_138-154.md",
    "DND5eSRD_155-175.md",
  ];

  for (const fileName of spellFiles) {
    const filePath = `${inputDir}/${fileName}`;
    try {
      const content = await Deno.readTextFile(filePath);
      const spells = extractSpellsFromFile(content, fileName);

      for (const spell of spells) {
        spellsByName[spell.name] = spell;

        // Build class index
        for (const className of spell.classes) {
          if (!spellsByClass[className]) {
            spellsByClass[className] = {};
          }
          const levelStr = spell.level.toString();
          if (!spellsByClass[className][levelStr]) {
            spellsByClass[className][levelStr] = [];
          }
          spellsByClass[className][levelStr].push(spell.name);
        }
      }

      console.log(`  Parsed ${spells.length} spells from ${fileName}`);
    } catch (error) {
      console.error(`  Warning: Could not read ${fileName}: ${error}`);
    }
  }

  // Write output files
  await Deno.writeTextFile(
    `${outputDir}/spells-by-name.json`,
    JSON.stringify(spellsByName, null, 2)
  );
  await Deno.writeTextFile(
    `${outputDir}/spells-by-class.json`,
    JSON.stringify(spellsByClass, null, 2)
  );

  console.log(`  Total spells processed: ${Object.keys(spellsByName).length}`);
}

/**
 * Extract spell entries from a single markdown file
 */
function extractSpellsFromFile(markdown: string, fileName: string): Spell[] {
  const spells: Spell[] = [];

  // Extract level 3 headers (### Spell Name)
  const sections = extractSections(markdown, 3);

  for (const [spellName, content] of sections) {
    // Skip non-spell headers (like section titles)
    if (!content.includes("**Casting Time:**")) {
      continue;
    }

    try {
      const spell = parseSpellSection(spellName, content, fileName);
      if (spell) {
        spells.push(spell);
      }
    } catch (error) {
      console.error(`  Warning: Failed to parse spell "${spellName}": ${error}`);
    }
  }

  return spells;
}

/**
 * Parse a single spell section
 */
function parseSpellSection(spellName: string, content: string, fileName: string): Spell | null {
  // Extract italic header (e.g., "*Level 2 Evocation (Wizard)*")
  const italicHeader = extractItalicHeader(content);
  if (!italicHeader) {
    return null;
  }

  const headerData = parseSpellHeader(italicHeader);
  if (!headerData) {
    return null;
  }

  // Extract spell fields
  const castingTime = extractField(content, "Casting Time") || "Unknown";
  const range = extractField(content, "Range") || "Unknown";
  const componentsStr = extractField(content, "Components") || "";
  const duration = extractField(content, "Duration") || "Unknown";

  // Parse components
  const components = parseComponents(componentsStr);

  // Extract description (everything after Duration until next section)
  const descriptionMatch = content.match(/\*\*Duration:\*\*[^\n]+\n+([\s\S]+)/);
  let description = "";
  let higherLevels: string | undefined;
  let cantripUpgrade: string | undefined;

  if (descriptionMatch) {
    let fullDescription = descriptionMatch[1];

    // Extract "Using a Higher-Level Spell Slot" section
    const higherLevelsMatch = fullDescription.match(/\*\*\*Using a Higher-Level Spell Slot\.\*\*\*\s*(.+?)(?=\n\n|\n\*\*\*|$)/s);
    if (higherLevelsMatch) {
      higherLevels = higherLevelsMatch[1].trim();
      fullDescription = fullDescription.replace(higherLevelsMatch[0], "");
    }

    // Extract "Cantrip Upgrade" section
    const cantripMatch = fullDescription.match(/\*\*\*Cantrip Upgrade\.\*\*\*\s*(.+?)(?=\n\n|\n\*\*\*|$)/s);
    if (cantripMatch) {
      cantripUpgrade = cantripMatch[1].trim();
      fullDescription = fullDescription.replace(cantripMatch[0], "");
    }

    description = cleanDescription(fullDescription);
  }

  // Get line number for source reference
  const lineNumber = getLineNumber(content, new RegExp(spellName)) || 0;

  const spell: Spell = {
    name: spellName,
    level: headerData.level as Spell["level"],
    school: headerData.school as Spell["school"],
    classes: headerData.classes,
    castingTime,
    range,
    components,
    duration,
    concentration: isConcentration(duration),
    ritual: isRitual(castingTime),
    description,
    source: {
      file: fileName,
      line: lineNumber,
    },
  };

  if (higherLevels) {
    spell.higherLevels = higherLevels;
  }

  if (cantripUpgrade) {
    spell.cantrip = cantripUpgrade;
  }

  return spell;
}
