/**
 * Feat Parser using marked.js AST
 *
 * Parses D&D 5e feats from normalized SRD markdown
 */

import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type { FeatData, FeatCategory } from "../../src/types/feat-types.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { extractTokensUntilHeading } from "../utils/parser-utils.ts";

/**
 * Parse feats from normalized SRD
 */
export async function parseFeats(
  inputDir: string,
  outputDir: string,
): Promise<void> {
  console.log("\nParsing feats from normalized files...");
  await ensureDir(outputDir);

  const filePath = `${inputDir}/DND5eSRD_087-103.md`;
  const content = await Deno.readTextFile(filePath);
  const tokens = marked.lexer(content);

  const featsByCategory: Record<FeatCategory, FeatData[]> = {
    Origin: [],
    General: [],
    "Fighting Style": [],
    "Epic Boon": [],
  };

  let currentCategory: FeatCategory | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading") {
      const heading = token as Tokens.Heading;

      // Category headers (h2 level)
      if (heading.depth === 2) {
        if (heading.text === "Origin Feats") {
          currentCategory = "Origin";
        } else if (heading.text === "General Feats") {
          currentCategory = "General";
        } else if (heading.text === "Fighting Style Feats") {
          currentCategory = "Fighting Style";
        } else if (heading.text === "Epic Boon Feats") {
          currentCategory = "Epic Boon";
        } else {
          currentCategory = null; // Stop parsing after feat sections
        }
        continue;
      }

      // Feat name (h3 level)
      if (currentCategory && heading.depth === 3) {
        const featName = heading.text;
        const featTokens = extractTokensUntilHeading(tokens, i + 1, 3);
        const feat = parseFeatFromTokens(
          featName,
          currentCategory,
          featTokens,
          "DND5eSRD_087-103.md",
        );

        if (feat) {
          featsByCategory[currentCategory].push(feat);
        }
      }
    }
  }

  // Flatten into single array grouped by category
  const allFeats: FeatData[] = [
    ...featsByCategory["Origin"],
    ...featsByCategory["General"],
    ...featsByCategory["Fighting Style"],
    ...featsByCategory["Epic Boon"],
  ];

  // Write to single JSON file
  const outputPath = `${outputDir}/feats.json`;
  await Deno.writeTextFile(outputPath, JSON.stringify(allFeats, null, 2));

  console.log(
    `✓ Parsed ${allFeats.length} feats (Origin: ${featsByCategory["Origin"].length}, General: ${featsByCategory["General"].length}, Fighting Style: ${featsByCategory["Fighting Style"].length}, Epic Boon: ${featsByCategory["Epic Boon"].length})`,
  );
}

/**
 * Parse a single feat from its token stream
 */
function parseFeatFromTokens(
  name: string,
  category: FeatCategory,
  tokens: Token[],
  fileName: string,
): FeatData | null {
  let prerequisite: string | undefined;
  let repeatable = false;
  const descriptionParts: string[] = [];

  for (const token of tokens) {
    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      const text = para.text;

      // First italic paragraph is category with optional prerequisite
      if (text.startsWith("*") && text.endsWith("*")) {
        const match = text.match(/\*(.+?)\s*\(Prerequisite:\s*(.+?)\)\*/);
        if (match) {
          prerequisite = match[2];
        }
        continue; // Skip category line
      }

      // Check for Repeatable subsection
      if (text.startsWith("**Repeatable.**")) {
        repeatable = true;
      }

      // Add to description
      descriptionParts.push(text);
    } else if (token.type === "list") {
      const list = token as Tokens.List;
      for (const item of list.items) {
        descriptionParts.push("• " + item.text);
      }
    }
  }

  return {
    name,
    category,
    repeatable,
    prerequisite,
    description: descriptionParts,
    source: {
      file: fileName,
      line: 0,
    },
  };
}

// For direct execution
if (import.meta.main) {
  const basePath = Deno.cwd();
  const inputDir = `${basePath}/srd_reference/normalized`;
  const outputDir = `${basePath}/data/feats`;

  await parseFeats(inputDir, outputDir);
}
