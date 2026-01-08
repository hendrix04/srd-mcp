import { parseClasses } from "./parsers/class-parser-v2.ts";
import { parseSpells } from "./parsers/spell-parser-v2.ts";
import { parseBackgrounds } from "./parsers/background-parser.ts";
import { parseSpecies } from "./parsers/species-parser-v2.ts";
import { parseFeats } from "./parsers/feat-parser.ts";
import { parseCharacterRules } from "./parsers/character-rules-parser.ts";

/**
 * Main preprocessing script
 * Parses SRD markdown files and generates structured JSON data
 */
async function main() {
  const basePath = Deno.cwd();
  // Use normalized markdown files (run `deno task normalize` first)
  const normalizedDir = `${basePath}/srd_reference/normalized`;
  const rawInputDir = `${basePath}/srd_reference/DnD5eSRD_md`;
  const outputDir = `${basePath}/data`;

  console.log("Starting SRD preprocessing...\n");

  // Ensure output directories exist
  try {
    await Deno.mkdir(`${outputDir}/classes`, { recursive: true });
    await Deno.mkdir(`${outputDir}/spells`, { recursive: true });
    await Deno.mkdir(`${outputDir}/rules`, { recursive: true });
    await Deno.mkdir(`${outputDir}/backgrounds`, { recursive: true });
    await Deno.mkdir(`${outputDir}/species`, { recursive: true });
    await Deno.mkdir(`${outputDir}/feats`, { recursive: true });
  } catch (error) {
    console.error(`Error creating directories: ${error}`);
    Deno.exit(1);
  }

  // Parse each content type
  console.log("Parsing spells (from normalized files)...");
  await parseSpells(normalizedDir, `${outputDir}/spells`);

  console.log("\nParsing classes (from normalized files)...");
  await parseClasses(normalizedDir, `${outputDir}/classes`);

  console.log("\nParsing backgrounds (from normalized files)...");
  await parseBackgrounds(normalizedDir, `${outputDir}/backgrounds`);

  console.log("\nParsing species (from normalized files)...");
  await parseSpecies(normalizedDir, `${outputDir}/species`);

  console.log("\nParsing feats (from normalized files)...");
  await parseFeats(normalizedDir, `${outputDir}/feats`);

  console.log("\nParsing rules (from normalized files and glossary)...");
  await parseCharacterRules(
    normalizedDir,
    `${basePath}/srd_reference/srd_glossary.md`,
    `${outputDir}/rules`,
  );

  console.log("\n✓ Preprocessing complete!");
  console.log(`\nGenerated files in: ${outputDir}/`);
}

if (import.meta.main) {
  await main();
}
