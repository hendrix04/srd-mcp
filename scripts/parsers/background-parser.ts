/**
 * Background Parser using marked.js AST
 *
 * Parses D&D 5e backgrounds from normalized SRD markdown
 */

import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type { BackgroundData } from "../../src/types/background-types.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { extractPlainText } from "../utils/parser-utils.ts";

const BACKGROUNDS = ["Acolyte", "Criminal", "Sage", "Soldier"];
/**
 * Parse backgrounds from normalized SRD
 */
export async function parseBackgrounds(
  inputDir: string,
  outputDir: string,
): Promise<void> {
  console.log("\nParsing backgrounds from normalized files...");
  await ensureDir(outputDir);

  const filePath = `${inputDir}/DND5eSRD_077-086.md`;
  const content = await Deno.readTextFile(filePath);
  const tokens = marked.lexer(content);

  const backgrounds: BackgroundData[] = [];

  // Find "Background Descriptions" section
  let inBackgroundSection = false;
  let currentBackground: Partial<BackgroundData> | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading") {
      const heading = token as Tokens.Heading;

      // Find start of Background Descriptions
      if (heading.depth === 3 && heading.text === "Background Descriptions") {
        inBackgroundSection = true;
        continue;
      }

      // Background name (h4 level)
      if (inBackgroundSection && heading.depth === 4) {
        // Save previous background
        if (currentBackground && currentBackground.name) {
          backgrounds.push(currentBackground as BackgroundData);
        }

        // Check if this is a known background
        if (BACKGROUNDS.includes(heading.text)) {
          currentBackground = {
            name: heading.text,
            abilityScoreIncrease: [],
            feat: "",
            skillProficiencies: [],
            toolProficiency: "",
            equipment: "",
            source: {
              file: "DND5eSRD_077-086.md",
            },
          };
        } else {
          currentBackground = null;
        }
        continue;
      }

      // Stop when we reach Character Species
      if (heading.depth === 2 && heading.text.includes("Character Species")) {
        break;
      }
    }

    // Parse background fields
    if (currentBackground && token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      const text = para.text;

      // Each field is on its own line within the paragraph, separated by \n
      const lines = text.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Parse bold field names
        if (trimmedLine.startsWith("**Ability Scores:**")) {
          const abilitiesStr = trimmedLine
            .replace("**Ability Scores:**", "")
            .trim();
          currentBackground.abilityScoreIncrease = abilitiesStr
            .split(/,\s*/)
            .map((s) => s.trim());
        } else if (trimmedLine.startsWith("**Feat:**")) {
          currentBackground.feat = trimmedLine
            .replace("**Feat:**", "")
            .replace(/\s*\(see "Feats"\)/gi, "")
            .trim();
        } else if (trimmedLine.startsWith("**Skill Proficiencies:**")) {
          const skillsStr = trimmedLine
            .replace("**Skill Proficiencies:**", "")
            .trim();
          currentBackground.skillProficiencies = skillsStr
            .split(/\s+and\s+/)
            .map((s) => s.trim());
        } else if (trimmedLine.startsWith("**Tool Proficiency:**")) {
          currentBackground.toolProficiency = trimmedLine
            .replace("**Tool Proficiency:**", "")
            .replace(/\s*\(see "Equipment"\)/gi, "")
            .trim();
        } else if (trimmedLine.startsWith("**Equipment:**")) {
          currentBackground.equipment = trimmedLine
            .replace("**Equipment:**", "")
            .trim();
        }
      }
    }
  }

  // Save last background
  if (currentBackground && currentBackground.name) {
    backgrounds.push(currentBackground as BackgroundData);
  }

  // Write to single JSON file
  const outputPath = `${outputDir}/backgrounds.json`;
  await Deno.writeTextFile(outputPath, JSON.stringify(backgrounds, null, 2));

  console.log(`✓ Parsed ${backgrounds.length} backgrounds`);
}

// For direct execution
if (import.meta.main) {
  const basePath = Deno.cwd();
  const inputDir = `${basePath}/srd_reference/normalized`;
  const outputDir = `${basePath}/data/backgrounds`;

  await parseBackgrounds(inputDir, outputDir);
}
