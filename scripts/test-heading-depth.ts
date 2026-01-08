import { marked } from "marked";
import type { Tokens } from "marked";

const content = await Deno.readTextFile("srd_reference/normalized/DND5eSRD_019-035.md");
const tokens = marked.lexer(content);

for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  if (token.type === "heading") {
    const h = token as Tokens.Heading;
    if (h.text.includes("Generate Your Scores") || h.text.includes("Point Cost")) {
      console.log(`Depth ${h.depth}: "${h.text}" at index ${i}`);
    }
  }
}
