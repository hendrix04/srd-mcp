import { parseClasses } from "./parsers/class-parser.ts";
import { parseRaces } from "./parsers/race-parser.ts";
import { parseRules } from "./parsers/rules-parser.ts";
import { parseSpells } from "./parsers/spell-parser.ts";

/**
 * Main preprocessing script
 * Parses SRD markdown files and generates structured JSON data
 */
async function main() {
  const basePath = Deno.cwd();
  const inputDir = `${basePath}/srd_reference/DnD5eSRD_md`;
  const outputDir = `${basePath}/data`;

  console.log("Starting SRD preprocessing...\n");

  // Ensure output directories exist
  try {
    await Deno.mkdir(`${outputDir}/classes`, { recursive: true });
    await Deno.mkdir(`${outputDir}/races`, { recursive: true });
    await Deno.mkdir(`${outputDir}/spells`, { recursive: true });
    await Deno.mkdir(`${outputDir}/rules`, { recursive: true });
  } catch (error) {
    console.error(`Error creating directories: ${error}`);
    Deno.exit(1);
  }

  // Parse each content type
  console.log("Parsing spells...");
  await parseSpells(inputDir, `${outputDir}/spells`);

  console.log("\nParsing classes...");
  await parseClasses(inputDir, `${outputDir}/classes`);

  console.log("\nParsing races...");
  await parseRaces(inputDir, `${outputDir}/races`);

  console.log("\nParsing rules...");
  await parseRules(`${basePath}/srd_reference/srd_glossary.md`, `${outputDir}/rules`);

  console.log("\n✓ Preprocessing complete!");
  console.log(`\nGenerated files in: ${outputDir}/`);
}

if (import.meta.main) {
  await main();
}
