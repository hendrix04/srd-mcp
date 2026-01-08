/**
 * Index Generator
 *
 * Generates comprehensive indexes for the SRD from normalized markdown files
 * Creates hierarchical index structure for classes, spells, monsters, items, etc.
 */

import { marked } from "marked";
import type { Token, Tokens } from "marked";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";

const NORMALIZED_DIR = "srd_reference/normalized";
const INDEX_DIR = "srd_reference/srd_index";
const DATA_DIR = "data";

interface IndexEntry {
  name: string;
  file: string;
  category?: string;
}

/**
 * Extract all h2 and h3 headers from a file as index entries
 */
async function extractHeaders(
  filePath: string,
  fileName: string,
): Promise<IndexEntry[]> {
  const content = await Deno.readTextFile(filePath);
  const tokens = marked.lexer(content);

  const entries: IndexEntry[] = [];

  for (const token of tokens) {
    if (token.type === "heading" && (token.depth === 2 || token.depth === 3)) {
      const heading = token as Tokens.Heading;
      // Clean up the heading text (remove tags like [Action], [Condition], etc.)
      const name = heading.text.replace(/\s*\[[^\]]+\]/g, "").trim();

      if (name) {
        entries.push({
          name,
          file: fileName,
          category: token.depth === 2 ? "major" : "minor",
        });
      }
    }
  }

  return entries;
}

/**
 * Load class data from preprocessed JSON
 */
async function loadClassIndex(): Promise<IndexEntry[]> {
  const classesDir = `${DATA_DIR}/classes`;
  const entries: IndexEntry[] = [];

  try {
    for await (const entry of Deno.readDir(classesDir)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const className = entry.name.replace(".json", "");
        entries.push({
          name: className.charAt(0).toUpperCase() + className.slice(1),
          file: `data/classes/${entry.name}`,
          category: "class",
        });
      }
    }
  } catch {
    console.log("  ⚠ Classes directory not found, skipping class index");
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load spell data from preprocessed JSON
 */
async function loadSpellIndex(): Promise<IndexEntry[]> {
  const spellsDir = `${DATA_DIR}/spells`;
  const entries: IndexEntry[] = [];

  try {
    for await (const entry of Deno.readDir(spellsDir)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        try {
          const content = await Deno.readTextFile(`${spellsDir}/${entry.name}`);
          const spell = JSON.parse(content);

          if (spell.name) {
            entries.push({
              name: spell.name,
              file: `data/spells/${entry.name}`,
              category:
                spell.level !== undefined ? `Level ${spell.level}` : "Unknown",
            });
          }
        } catch (e) {
          console.log(
            `  ⚠ Error reading spell file ${entry.name}: ${e.message}`,
          );
        }
      }
    }
  } catch {
    console.log("  ⚠ Spells directory not found, skipping spell index");
  }

  return entries
    .filter((e) => e.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Generate alphabetically grouped index
 */
function groupByAlphabet(entries: IndexEntry[]): Map<string, IndexEntry[]> {
  const groups = new Map<string, IndexEntry[]>();

  for (const entry of entries) {
    const firstLetter = entry.name.charAt(0).toUpperCase();
    const group = groups.get(firstLetter) || [];
    group.push(entry);
    groups.set(firstLetter, group);
  }

  return groups;
}

/**
 * Generate master index file
 */
async function generateMasterIndex() {
  const lines: string[] = [];

  lines.push("# D&D 5E SRD Master Index");
  lines.push("");
  lines.push("Quick navigation to all SRD content categories.");
  lines.push("");
  lines.push("## Core Rules & Mechanics");
  lines.push(
    "- [Rules Glossary](../normalized/DND5eSRD_176-191.md) - Complete rules reference",
  );
  lines.push(
    "- [Combat & Actions](../srd_glossary.md) - Quick reference for conditions and actions",
  );
  lines.push("");
  lines.push("## Character Building");
  lines.push("- [Classes](classes.md) - All 12 character classes");
  lines.push("- [Spells](spells/index.md) - All spells A-Z");
  lines.push("");
  lines.push("## Monsters & NPCs");
  lines.push("- [Monsters](monsters.md) - Creature stat blocks");
  lines.push("");
  lines.push("## Equipment & Magic Items");
  lines.push("- [Equipment](equipment.md) - Weapons, armor, tools, gear");
  lines.push("- [Magic Items](magic_items.md) - Magical equipment");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*Auto-generated from D&D 5E System Reference Document 5.2.1*");
  lines.push(`*Generated: ${new Date().toISOString()}*`);

  await Deno.writeTextFile(`${INDEX_DIR}/index.md`, lines.join("\n"));
}

/**
 * Generate classes index
 */
async function generateClassesIndex() {
  const classes = await loadClassIndex();

  const lines: string[] = [];
  lines.push("# Classes Index");
  lines.push("");
  lines.push(`Total: ${classes.length} classes`);
  lines.push("");

  for (const cls of classes) {
    lines.push(`- [${cls.name}](../${cls.file})`);
  }

  lines.push("");
  lines.push("---");
  lines.push(`*Generated: ${new Date().toISOString()}*`);

  await Deno.writeTextFile(`${INDEX_DIR}/classes.md`, lines.join("\n"));
}

/**
 * Generate spells index with alphabetical grouping
 */
async function generateSpellsIndex() {
  const spells = await loadSpellIndex();
  const grouped = groupByAlphabet(spells);

  // Create spells subdirectory
  await ensureDir(`${INDEX_DIR}/spells`);

  // Master spells index
  const masterLines: string[] = [];
  masterLines.push("# Spells Index");
  masterLines.push("");
  masterLines.push(`Total: ${spells.length} spells`);
  masterLines.push("");
  masterLines.push("## Browse by Letter");
  masterLines.push("");

  const alphabet = Array.from(grouped.keys()).sort();
  for (const letter of alphabet) {
    const count = grouped.get(letter)?.length || 0;
    masterLines.push(
      `- [${letter}](#${letter.toLowerCase()}) (${count} spells)`,
    );
  }

  masterLines.push("");

  // Add all spells grouped by letter
  for (const letter of alphabet) {
    const letterSpells = grouped.get(letter) || [];
    masterLines.push(`## ${letter}`);
    masterLines.push("");

    for (const spell of letterSpells) {
      masterLines.push(
        `- [${spell.name}](../../${spell.file}) - ${spell.category}`,
      );
    }

    masterLines.push("");
  }

  masterLines.push("---");
  masterLines.push(`*Generated: ${new Date().toISOString()}*`);

  await Deno.writeTextFile(
    `${INDEX_DIR}/spells/index.md`,
    masterLines.join("\n"),
  );
}

/**
 * Generate equipment index from Rules Glossary
 */
async function generateEquipmentIndex() {
  const lines: string[] = [];

  lines.push("# Equipment Index");
  lines.push("");
  lines.push("Equipment, weapons, and armor from the SRD.");
  lines.push("");
  lines.push(
    "For detailed equipment rules, see [Rules Glossary](../normalized/DND5eSRD_176-191.md).",
  );
  lines.push("");
  lines.push("---");
  lines.push(`*Generated: ${new Date().toISOString()}*`);

  await Deno.writeTextFile(`${INDEX_DIR}/equipment.md`, lines.join("\n"));
}

/**
 * Generate monsters index from monster stat blocks
 */
async function generateMonstersIndex() {
  // Extract monster names from the monster files (typically DND5eSRD_204-332.md range)
  const monsterFiles = [
    "DND5eSRD_204-229.md",
    "DND5eSRD_230-252.md",
    "DND5eSRD_253-272.md",
    "DND5eSRD_273-292.md",
    "DND5eSRD_293-312.md",
    "DND5eSRD_313-332.md",
  ];

  const monsters: IndexEntry[] = [];

  for (const fileName of monsterFiles) {
    const entries = await extractHeaders(
      `${NORMALIZED_DIR}/${fileName}`,
      fileName,
    );
    monsters.push(...entries.filter((e) => e.category === "major")); // h2 headers are monster names
  }

  const grouped = groupByAlphabet(monsters);

  const lines: string[] = [];
  lines.push("# Monsters Index");
  lines.push("");
  lines.push(`Total: ${monsters.length} creatures`);
  lines.push("");

  const alphabet = Array.from(grouped.keys()).sort();

  for (const letter of alphabet) {
    const letterMonsters = grouped.get(letter) || [];
    lines.push(`## ${letter}`);
    lines.push("");

    for (const monster of letterMonsters) {
      lines.push(
        `- ${monster.name} - [${monster.file}](../normalized/${monster.file})`,
      );
    }

    lines.push("");
  }

  lines.push("---");
  lines.push(`*Generated: ${new Date().toISOString()}*`);

  await Deno.writeTextFile(`${INDEX_DIR}/monsters.md`, lines.join("\n"));
}

/**
 * Generate magic items index
 */
async function generateMagicItemsIndex() {
  // Magic items are typically in files DND5eSRD_087-103.md through DND5eSRD_155-175.md
  const itemFiles = [
    "DND5eSRD_087-103.md",
    "DND5eSRD_104-120.md",
    "DND5eSRD_121-137.md",
    "DND5eSRD_138-154.md",
    "DND5eSRD_155-175.md",
  ];

  const items: IndexEntry[] = [];

  for (const fileName of itemFiles) {
    try {
      const entries = await extractHeaders(
        `${NORMALIZED_DIR}/${fileName}`,
        fileName,
      );
      // Magic items are typically h3 headers in the magic items section
      items.push(...entries);
    } catch {
      // File might not exist or have different structure
    }
  }

  const lines: string[] = [];
  lines.push("# Magic Items Index");
  lines.push("");
  lines.push(`Estimated: ${items.length} entries`);
  lines.push("");
  lines.push("For magic items, see the SRD files:");
  lines.push("");

  for (const fileName of itemFiles) {
    lines.push(`- [${fileName}](../normalized/${fileName})`);
  }

  lines.push("");
  lines.push("---");
  lines.push(`*Generated: ${new Date().toISOString()}*`);

  await Deno.writeTextFile(`${INDEX_DIR}/magic_items.md`, lines.join("\n"));
}

/**
 * Main execution
 */
async function main() {
  console.log("=== SRD Index Generator ===\n");

  // Ensure index directory exists
  await ensureDir(INDEX_DIR);

  console.log("Generating master index...");
  await generateMasterIndex();
  console.log("  ✓ Master index created");

  console.log("Generating classes index...");
  await generateClassesIndex();
  console.log("  ✓ Classes index created");

  console.log("Generating spells index...");
  await generateSpellsIndex();
  console.log("  ✓ Spells index created");

  console.log("Generating monsters index...");
  await generateMonstersIndex();
  console.log("  ✓ Monsters index created");

  console.log("Generating equipment index...");
  await generateEquipmentIndex();
  console.log("  ✓ Equipment index created");

  console.log("Generating magic items index...");
  await generateMagicItemsIndex();
  console.log("  ✓ Magic items index created");

  console.log("\n✓ Index generation complete!");
  console.log(`  Output directory: ${INDEX_DIR}`);
}

if (import.meta.main) {
  main();
}
