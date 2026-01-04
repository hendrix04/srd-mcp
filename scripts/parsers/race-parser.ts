import type { RaceData } from "../../src/types/race-types.ts";
import { extractField, extractSections } from "../utils/markdown-utils.ts";

/**
 * Parse all races from the SRD markdown
 */
export async function parseRaces(inputDir: string, outputDir: string): Promise<void> {
  // Races are in DND5eSRD_077-086.md
  const filePath = `${inputDir}/DND5eSRD_077-086.md`;

  try {
    const content = await Deno.readTextFile(filePath);
    const races = extractRaces(content, "DND5eSRD_077-086.md");

    for (const race of races) {
      const outputPath = `${outputDir}/${race.name.toLowerCase().replace(/\s+/g, "-")}.json`;
      await Deno.writeTextFile(outputPath, JSON.stringify(race, null, 2));
    }

    console.log(`  Parsed ${races.length} races`);
  } catch (error) {
    console.error(`  Error parsing races: ${error}`);
  }
}

/**
 * Extract all race entries from markdown
 */
function extractRaces(markdown: string, fileName: string): RaceData[] {
  const races: RaceData[] = [];

  // Find "Species Descriptions" section
  const sections = extractSections(markdown, 2);
  let speciesSection = "";

  for (const [title, content] of sections) {
    if (title.includes("Species Descriptions") || title.includes("Character Species")) {
      speciesSection = content;
      break;
    }
  }

  if (!speciesSection) {
    console.warn("  Could not find Species Descriptions section");
    return races;
  }

  // Extract individual species (### Species Name)
  const speciesSections = extractSections(speciesSection, 4);

  for (const [raceName, content] of speciesSections) {
    try {
      const race = parseRace(raceName, content, fileName);
      if (race) {
        races.push(race);
      }
    } catch (error) {
      console.error(`  Warning: Failed to parse race "${raceName}": ${error}`);
    }
  }

  return races;
}

/**
 * Parse a single race section
 */
function parseRace(raceName: string, content: string, fileName: string): RaceData | null {
  // Extract basic info
  const sizeMatch = extractField(content, "Size");
  const speedMatch = extractField(content, "Speed");

  const size = sizeMatch || "Medium";
  const speed = speedMatch ? parseInt(speedMatch) : 30;

  // Extract traits (look for bold trait names)
  const traits: RaceData["traits"] = [];
  const traitMatches = content.matchAll(/\*\*([^*]+)\.\*\*\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/g);

  for (const match of traitMatches) {
    const traitName = match[1].trim();
    const traitDescription = match[2].trim();

    // Skip metadata fields
    if (
      traitName.includes("Creature Type") ||
      traitName.includes("Size") ||
      traitName.includes("Speed")
    ) {
      continue;
    }

    traits.push({
      name: traitName,
      description: traitDescription,
    });
  }

  return {
    name: raceName,
    size: size as RaceData["size"],
    speed,
    traits,
    source: {
      file: fileName,
      line: 0,
    },
  };
}
