import { marked } from "marked";
import type { Token, Tokens } from "marked";

const content = await Deno.readTextFile("srd_reference/normalized/DND5eSRD_077-086.md");
const tokens = marked.lexer(content);

// Find Dragonborn section
let inDragonborn = false;
let tokenCount = 0;

for (let i = 0; i < tokens.length && tokenCount < 20; i++) {
  const token = tokens[i];

  if (token.type === "heading" && (token as Tokens.Heading).text === "Dragonborn") {
    inDragonborn = true;
    console.log(`\n=== DRAGONBORN SECTION (starting at token ${i}) ===\n`);
    continue;
  }

  if (inDragonborn) {
    console.log(`Token ${tokenCount}: ${token.type}`);
    if (token.type === "heading") {
      console.log(`  Heading (depth ${(token as Tokens.Heading).depth}): "${(token as Tokens.Heading).text}"`);
    } else if (token.type === "paragraph") {
      const text = (token as Tokens.Paragraph).text;
      console.log(`  Paragraph: "${text.substring(0, 80)}..."`);
    } else if (token.type === "table") {
      console.log(`  Table with ${(token as Tokens.Table).header.length} columns, ${(token as Tokens.Table).rows.length} rows`);
    }
    tokenCount++;

    // Stop at next species
    if (token.type === "heading" && (token as Tokens.Heading).depth === 4) {
      break;
    }
  }
}
