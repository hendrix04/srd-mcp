/**
 * Species/Race Parser V2 using marked.js AST
 *
 * Parses D&D 5e species (races) from normalized SRD markdown
 * Includes proper table extraction for variant traits
 */

import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type { RaceData, RaceTrait } from "../../src/types/race-types.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";
import {
  extractTokensUntilHeading,
  extractTableData,
} from "../utils/parser-utils.ts";

const SPECIES = [
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Goliath",
  "Halfling",
  "Human",
  "Orc",
  "Tiefling",
];

/**
 * Parse species from normalized SRD
 */
export async function parseSpecies(
  inputDir: string,
  outputDir: string,
): Promise<void> {
  console.log("\nParsing species from normalized files...");
  await ensureDir(outputDir);

  const filePath = `${inputDir}/DND5eSRD_077-086.md`;
  const content = await Deno.readTextFile(filePath);
  const tokens = marked.lexer(content);

  const speciesList: RaceData[] = [];

  // Find "Species Descriptions" section
  let inSpeciesSection = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading") {
      const heading = token as Tokens.Heading;

      // Find start of Species Descriptions
      if (heading.depth === 3 && heading.text === "Species Descriptions") {
        inSpeciesSection = true;
        continue;
      }

      // Species name (h4 level)
      if (inSpeciesSection && heading.depth === 4) {
        const speciesName = heading.text;

        if (SPECIES.includes(speciesName)) {
          // Extract tokens until next h4 or h2
          const speciesTokens = extractTokensUntilHeading(tokens, i + 1, 4);
          const species = parseSpeciesFromTokens(
            speciesName,
            speciesTokens,
            "DND5eSRD_077-086.md",
          );

          if (species) {
            speciesList.push(species);
            console.log(`  ✓ Parsed ${speciesName}`);
          }
        }
      }

      // Stop at next major section
      if (inSpeciesSection && heading.depth === 2) {
        break;
      }
    }
  }

  // Write individual files
  for (const species of speciesList) {
    const fileName = species.name.toLowerCase().replace(/\s+/g, "-");
    const outputPath = `${outputDir}/${fileName}.json`;
    await Deno.writeTextFile(outputPath, JSON.stringify(species, null, 2));
  }

  console.log(`✓ Parsed ${speciesList.length} species`);
}

/**
 * Parse a single species from its token stream
 */
function parseSpeciesFromTokens(
  name: string,
  tokens: Token[],
  fileName: string,
): RaceData | null {
  let creatureType = "Humanoid";
  let size = "Medium";
  let speed = 30;
  const traits: RaceTrait[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Parse metadata from bold paragraphs
    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      const text = para.text;

      if (text.startsWith("**Creature Type:**")) {
        creatureType = text.replace("**Creature Type:**", "").trim();
      } else if (text.startsWith("**Size:**")) {
        const sizeText = text.replace("**Size:**", "").trim();
        // Extract size category (Medium, Small, etc.)
        if (sizeText.includes("Small")) size = "Small";
        else if (sizeText.includes("Medium")) size = "Medium";
        else if (sizeText.includes("Large")) size = "Large";
      } else if (text.startsWith("**Speed:**")) {
        const speedText = text.replace("**Speed:**", "").trim();
        const speedMatch = speedText.match(/(\d+)/);
        if (speedMatch) speed = parseInt(speedMatch[1]);
      }
      // Parse trait (starts with **TraitName.**)
      else if (text.match(/^\*\*[^*]+\.\*\*/)) {
        const traitMatch = text.match(/^\*\*([^*]+)\.\*\*\s*(.+)/);
        if (traitMatch) {
          const traitName = traitMatch[1].trim();
          let traitDescription = traitMatch[2].trim();

          // Check if next tokens continue this trait (tables or paragraphs)
          const continuationTokens: Token[] = [];
          for (let j = i + 1; j < tokens.length; j++) {
            const nextToken = tokens[j];

            // Skip space, hr, and html tokens (page markers, separators)
            if (
              nextToken.type === "space" ||
              nextToken.type === "hr" ||
              nextToken.type === "html"
            ) {
              continue;
            }

            // Stop at next trait
            if (nextToken.type === "paragraph") {
              const nextPara = nextToken as Tokens.Paragraph;
              // Skip page number paragraphs (just numbers)
              if (nextPara.text.match(/^\d+$/)) {
                continue;
              }
              // Stop at next trait
              if (nextPara.text.match(/^\*\*[^*]+\.\*\*/)) break;
              continuationTokens.push(nextToken);
            } else if (nextToken.type === "heading") {
              const heading = nextToken as Tokens.Heading;
              // Include h5 headers (like "Draconic Ancestors" or "Elven Lineages" table headers)
              if (heading.depth === 5) {
                continuationTokens.push(nextToken);
              } else {
                // Stop at h4 or higher (next species or major section)
                break;
              }
            } else if (nextToken.type === "table") {
              continuationTokens.push(nextToken);
            } else if (nextToken.type === "list") {
              continuationTokens.push(nextToken);
            } else {
              break;
            }
          }

          // Add continuation text and tables
          for (const contToken of continuationTokens) {
            if (contToken.type === "paragraph") {
              traitDescription += "\n\n" + (contToken as Tokens.Paragraph).text;
            } else if (contToken.type === "table") {
              traitDescription +=
                "\n\n" + formatTable(contToken as Tokens.Table);
            } else if (contToken.type === "list") {
              const list = contToken as Tokens.List;
              for (const item of list.items) {
                traitDescription += "\n• " + item.text;
              }
            } else if (contToken.type === "heading") {
              traitDescription +=
                "\n\n## " + (contToken as Tokens.Heading).text;
            }
          }

          traits.push({
            name: traitName,
            description: traitDescription,
          });
        }
      }
    }
  }

  return {
    name,
    size: size as RaceData["size"],
    speed,
    traits,
    source: {
      file: fileName,
      line: 0,
    },
  };
}

/**
 * Format a table as markdown text for inclusion in trait description
 */
function formatTable(table: Tokens.Table): string {
  const rows: string[] = [];

  // Header row
  const headers = table.header.map((h) => h.text);
  rows.push("| " + headers.join(" | ") + " |");
  rows.push("| " + headers.map(() => "---").join(" | ") + " |");

  // Data rows
  for (const row of table.rows) {
    const cells = row.map((cell) => cell.text);
    rows.push("| " + cells.join(" | ") + " |");
  }

  return rows.join("\n");
}

// For direct execution
if (import.meta.main) {
  const basePath = Deno.cwd();
  const inputDir = `${basePath}/srd_reference/normalized`;
  const outputDir = `${basePath}/data/species`;

  await parseSpecies(inputDir, outputDir);
}
