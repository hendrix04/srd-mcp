import { marked } from "marked";
import type { Token } from "marked";

const content = await Deno.readTextFile(
  "srd_reference/normalized/DND5eSRD_047-063.md",
);
const tokens = marked.lexer(content);

const classNames = ["Fighter"];

function extractClassSections(tokens: Token[]): Map<string, Token[]> {
  const classSections = new Map<string, Token[]>();
  let currentClass: string | null = null;
  let currentTokens: Token[] = [];

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 2) {
      const headerText = token.text;

      // Check if this is a class header
      const matchedClass = classNames.find((name) => {
        if (headerText === name) return true;
        if (headerText.startsWith(`${name} `)) {
          if (headerText.startsWith(`${name} Subclass:`)) return false;
          return true;
        }
        return false;
      });

      console.log(
        `H2: "${headerText}" → matched: ${matchedClass || "none"}, current: ${currentClass || "none"}`,
      );

      if (matchedClass) {
        if (matchedClass === currentClass) {
          currentTokens.push(token);
          console.log(
            `  → Continuing ${currentClass}, now ${currentTokens.length} tokens`,
          );
        } else {
          if (currentClass && currentTokens.length > 0) {
            const existing = classSections.get(currentClass) || [];
            classSections.set(currentClass, [...existing, ...currentTokens]);
            console.log(
              `  → Saved ${currentClass} (${currentTokens.length} tokens), starting ${matchedClass}`,
            );
          }
          currentClass = matchedClass;
          currentTokens = [token];
        }
      } else {
        if (currentClass && currentTokens.length > 0) {
          const existing = classSections.get(currentClass) || [];
          classSections.set(currentClass, [...existing, ...currentTokens]);
          console.log(
            `  → Saved ${currentClass} (${currentTokens.length} tokens), ending`,
          );
        }
        currentClass = null;
        currentTokens = [];
      }
    } else if (currentClass) {
      currentTokens.push(token);
    }
  }

  if (currentClass && currentTokens.length > 0) {
    const existing = classSections.get(currentClass) || [];
    classSections.set(currentClass, [...existing, ...currentTokens]);
    console.log(`Final save: ${currentClass} (${currentTokens.length} tokens)`);
  }

  return classSections;
}

const sections = extractClassSections(tokens);
const fighterTokens = sections.get("Fighter");

console.log(`\n=== Fighter has ${fighterTokens?.length} tokens ===\n`);

let h3Count = 0;
for (const token of fighterTokens || []) {
  if (
    token.type === "heading" &&
    token.depth === 3 &&
    token.text.includes("Level")
  ) {
    h3Count++;
    console.log(`${h3Count}. ${token.text}`);
  }
}

console.log(`\nTotal h3 Level headings: ${h3Count}`);
