/**
 * Spell Parser V2 - AST-based using marked.js
 *
 * Parses D&D 5e spells from normalized SRD markdown files.
 * Outputs two files:
 * - spells-by-name.json: All spells indexed by name
 * - spells-by-class.json: Class -> level -> spell names index
 */

import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type {
  Spell,
  SpellComponents,
  SpellsByClass,
  SpellsByName,
} from "../../src/types/spell-types.ts";
import type { MagicSchool } from "../../src/types/common-types.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";

// Spell files in normalized directory
const SPELL_FILES = [
  "DND5eSRD_104-120.md",
  "DND5eSRD_121-137.md",
  "DND5eSRD_138-154.md",
  "DND5eSRD_155-175.md",
];

// Valid magic schools
const MAGIC_SCHOOLS: MagicSchool[] = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
];

/**
 * Parse the italic header line: "*Level 2 Abjuration (Bard, Cleric)*" or "*Evocation Cantrip (Sorcerer, Wizard)*"
 */
function parseSpellHeader(
  text: string,
): { level: number; school: MagicSchool; classes: string[] } | null {
  // Remove asterisks
  const clean = text.replace(/^\*|\*$/g, "").trim();

  // Pattern 1: "Level X School (Classes)" - e.g., "Level 2 Abjuration (Bard, Cleric)"
  const levelMatch = clean.match(/Level\s+(\d+)\s+(\w+)\s*\(([^)]+)\)/i);
  if (levelMatch) {
    const level = parseInt(levelMatch[1]);
    const school = levelMatch[2] as MagicSchool;
    const classes = levelMatch[3].split(/,\s*/).map((c) => c.trim());

    if (MAGIC_SCHOOLS.includes(school)) {
      return { level, school, classes };
    }
  }

  // Pattern 2: "School Cantrip (Classes)" - e.g., "Evocation Cantrip (Sorcerer, Wizard)"
  const cantripMatch = clean.match(/(\w+)\s+Cantrip\s*\(([^)]+)\)/i);
  if (cantripMatch) {
    const school = cantripMatch[1] as MagicSchool;
    const classes = cantripMatch[2].split(/,\s*/).map((c) => c.trim());

    if (MAGIC_SCHOOLS.includes(school)) {
      return { level: 0, school, classes };
    }
  }

  return null;
}

/**
 * Extract a bold field value: "**Casting Time:** Action" -> "Action"
 */
function extractBoldField(text: string, fieldName: string): string | null {
  const pattern = new RegExp(
    `\\*\\*${fieldName}:\\*\\*\\s*(.+?)(?:\\n|$)`,
    "i",
  );
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Parse spell components: "V, S, M (a bit of fur)" -> { V: true, S: true, M: "a bit of fur" }
 */
function parseComponents(text: string): SpellComponents {
  const components: SpellComponents = {
    V: false,
    S: false,
    M: null,
  };

  if (text.includes("V")) components.V = true;
  if (text.includes("S")) components.S = true;

  // Material component with description
  const materialMatch = text.match(/M\s*\(([^)]+)\)/);
  if (materialMatch) {
    components.M = materialMatch[1].trim();
  } else if (text.includes("M")) {
    components.M = ""; // Has M but no description
  }

  return components;
}

/**
 * Check if duration indicates concentration
 */
function isConcentration(duration: string): boolean {
  return duration.toLowerCase().includes("concentration");
}

/**
 * Check if casting time indicates ritual
 */
function isRitual(castingTime: string): boolean {
  return castingTime.toLowerCase().includes("ritual");
}

/**
 * Parse a single spell from tokens
 */
function parseSpellFromTokens(
  name: string,
  tokens: Token[],
  fileName: string,
): Spell | null {
  if (tokens.length === 0) return null;

  // First token should be paragraph with italic header
  let headerInfo: {
    level: number;
    school: MagicSchool;
    classes: string[];
  } | null = null;
  let descriptionParts: string[] = [];
  let higherLevels: string | undefined;
  let cantripUpgrade: string | undefined;

  // Build raw text from tokens to extract fields
  let rawText = "";
  for (const token of tokens) {
    if (token.type === "paragraph") {
      rawText += (token as Tokens.Paragraph).text + "\n";
    }
  }

  // Parse header from first paragraph
  const firstPara = tokens.find((t) => t.type === "paragraph") as
    | Tokens.Paragraph
    | undefined;
  if (firstPara) {
    const headerMatch = firstPara.text.match(/^\*[^*]+\*$/m);
    if (headerMatch) {
      headerInfo = parseSpellHeader(headerMatch[0]);
    }
  }

  if (!headerInfo) {
    return null;
  }

  // Extract fields
  const castingTime = extractBoldField(rawText, "Casting Time") || "Action";
  const range = extractBoldField(rawText, "Range") || "Self";
  const componentsStr = extractBoldField(rawText, "Components") || "";
  const duration = extractBoldField(rawText, "Duration") || "Instantaneous";
  const components = parseComponents(componentsStr);

  // Extract description (everything after Duration line)
  let inDescription = false;
  for (const token of tokens) {
    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      const text = para.text;

      // Check for higher levels section
      if (text.includes("***Using a Higher-Level Spell Slot.***")) {
        const match = text.match(
          /\*\*\*Using a Higher-Level Spell Slot\.\*\*\*\s*(.+)/s,
        );
        if (match) {
          higherLevels = match[1].trim();
        }
        continue;
      }

      // Check for cantrip upgrade section
      if (text.includes("***Cantrip Upgrade.***")) {
        const match = text.match(/\*\*\*Cantrip Upgrade\.\*\*\*\s*(.+)/s);
        if (match) {
          cantripUpgrade = match[1].trim();
        }
        continue;
      }

      // Skip header and field lines
      if (text.startsWith("*") && text.endsWith("*") && text.includes("("))
        continue;
      if (text.includes("**Casting Time:**")) continue;
      if (text.includes("**Range:**")) continue;
      if (text.includes("**Components:**")) continue;
      if (text.includes("**Duration:**")) {
        inDescription = true;
        // Get any text after Duration line on same paragraph
        const afterDuration = text.split(/\*\*Duration:\*\*[^\n]+\n?/)[1];
        if (afterDuration?.trim()) {
          descriptionParts.push(afterDuration.trim());
        }
        continue;
      }

      if (inDescription) {
        descriptionParts.push(text);
      }
    } else if (token.type === "list" && inDescription) {
      const list = token as Tokens.List;
      for (const item of list.items) {
        descriptionParts.push("• " + item.text);
      }
    } else if (token.type === "table" && inDescription) {
      // Some spells have tables in their description
      const table = token as Tokens.Table;
      const headers = table.header.map((h) => h.text).join(" | ");
      descriptionParts.push(`| ${headers} |`);
      descriptionParts.push(`| ${table.header.map(() => "---").join(" | ")} |`);
      for (const row of table.rows) {
        descriptionParts.push(`| ${row.map((c) => c.text).join(" | ")} |`);
      }
    }
  }

  const description = descriptionParts.join("\n\n").trim();

  const spell: Spell = {
    name,
    level: headerInfo.level as Spell["level"],
    school: headerInfo.school,
    classes: headerInfo.classes,
    castingTime,
    range,
    components,
    duration,
    concentration: isConcentration(duration),
    ritual: isRitual(castingTime),
    description,
    source: {
      file: fileName,
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

/**
 * Check if a heading is a spell name (not a section heading)
 */
function isSpellHeading(
  text: string,
  tokens: Token[],
  headingIndex: number,
): boolean {
  // Spell names are typically in ALL CAPS or Title Case
  // And the next token should be a paragraph with italic school/level info

  // Skip known section headings, page markers, and system reference footers
  if (text.startsWith("Page ")) return false;
  if (text.startsWith("*") && text.includes("System Reference Document"))
    return false;

  const sectionHeadings = [
    "Preparing Spells",
    "Always-Prepared Spells",
    "One Spell with a Spell Slot per Turn",
    "Reaction and Bonus Action Triggers",
    "Longer Casting Times",
    "Verbal",
    "Somatic",
    "Material",
    "Costly Components",
    "Spell Descriptions",
    "Spells",
    "Gaining Spells",
    "Casting Spells",
    "Spell Level",
    "Spell Slots",
    "Casting without Slots",
    "Using a Higher-Level Spell Slot",
    "School of Magic",
    "Class Spell Lists",
    "Casting Time",
    "Range",
    "Components",
    "Duration",
    "Targets",
    "Saving Throws",
    "Attack Rolls",
    "Combining Effects",
    "Materials",
  ];

  for (const section of sectionHeadings) {
    if (text === section) return false;
  }

  // Check if next paragraph starts with spell header pattern
  for (
    let i = headingIndex + 1;
    i < Math.min(headingIndex + 3, tokens.length);
    i++
  ) {
    const token = tokens[i];
    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      // Spell header pattern: *Level X School (Classes)* or *School Cantrip (Classes)*
      // Can be at start of multi-line paragraph
      if (
        para.text.match(/^\*(?:Level\s+\d+\s+\w+|\w+\s+Cantrip)\s*\([^)]+\)\*/m)
      ) {
        return true;
      }
      break;
    }
  }

  return false;
}

/**
 * Extract tokens for a spell (until next heading of same or higher level)
 */
function extractSpellTokens(
  tokens: Token[],
  startIndex: number,
  headingDepth: number,
): Token[] {
  const result: Token[] = [];

  for (let i = startIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Stop at next heading of same or higher level
    if (
      token.type === "heading" &&
      (token as Tokens.Heading).depth <= headingDepth
    ) {
      break;
    }

    result.push(token);
  }

  return result;
}

/**
 * Parse all spells from a file
 */
function parseSpellsFromFile(content: string, fileName: string): Spell[] {
  const tokens = marked.lexer(content);
  const spells: Spell[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Spells can be at h2 or h3 level depending on the file
    if (token.type === "heading") {
      const heading = token as Tokens.Heading;
      const depth = heading.depth;

      // Only check h2 and h3 headings
      if (depth !== 2 && depth !== 3) continue;

      const spellName = heading.text;

      if (isSpellHeading(spellName, tokens, i)) {
        const spellTokens = extractSpellTokens(tokens, i, depth);
        const spell = parseSpellFromTokens(spellName, spellTokens, fileName);

        if (spell) {
          spells.push(spell);
        }
      }
    }
  }

  return spells;
}

/**
 * Main entry point
 */
export async function parseSpells(
  inputDir: string,
  outputDir: string,
): Promise<void> {
  console.log("\nParsing spells from normalized files...");
  await ensureDir(outputDir);

  const spellsByName: SpellsByName = {};
  const spellsByClass: SpellsByClass = {};

  for (const fileName of SPELL_FILES) {
    const filePath = `${inputDir}/${fileName}`;

    try {
      const content = await Deno.readTextFile(filePath);
      const spells = parseSpellsFromFile(content, fileName);

      for (const spell of spells) {
        // Add to name index
        spellsByName[spell.name] = spell;

        // Add to class index
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

      console.log(`  ✓ ${spells.length} spells from ${fileName}`);
    } catch (error) {
      console.error(`  ✗ Error reading ${fileName}: ${error}`);
    }
  }

  // Write output files
  await Deno.writeTextFile(
    `${outputDir}/spells-by-name.json`,
    JSON.stringify(spellsByName, null, 2),
  );

  await Deno.writeTextFile(
    `${outputDir}/spells-by-class.json`,
    JSON.stringify(spellsByClass, null, 2),
  );

  const totalSpells = Object.keys(spellsByName).length;
  console.log(`\n✓ Parsed ${totalSpells} spells total`);
}

// For direct execution
if (import.meta.main) {
  const basePath = Deno.cwd();
  const inputDir = `${basePath}/srd_reference/normalized`;
  const outputDir = `${basePath}/data/spells`;

  await parseSpells(inputDir, outputDir);
}
