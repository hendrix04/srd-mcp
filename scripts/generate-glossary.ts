/**
 * Glossary Generator
 *
 * Generates srd_glossary.md from normalized SRD Rules Glossary file
 * Extracts conditions and actions for quick reference
 */

import { marked } from "marked";
import type { Token, Tokens } from "marked";

const NORMALIZED_DIR = "srd_reference/normalized";
const RULES_GLOSSARY_FILE = `${NORMALIZED_DIR}/DND5eSRD_176-191.md`;
const OUTPUT_FILE = "srd_reference/srd_glossary.md";

interface GlossaryEntry {
  term: string;
  definition: string;
}

/**
 * Extract entries with a specific tag from the Rules Glossary
 */
async function extractTaggedEntries(tag: string): Promise<GlossaryEntry[]> {
  const content = await Deno.readTextFile(RULES_GLOSSARY_FILE);
  const tokens = marked.lexer(content);

  const entries: GlossaryEntry[] = [];
  let currentTerm = "";
  let currentDefinition: string[] = [];
  let collectingEntry = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading" && token.depth === 3) {
      const heading = token as Tokens.Heading;

      // Check if this is a tagged entry we want
      if (heading.text.includes(`[${tag}]`)) {
        // Save previous entry if exists
        if (currentTerm && currentDefinition.length > 0) {
          entries.push({
            term: currentTerm,
            definition: currentDefinition.join(" ").trim(),
          });
        }

        // Start new entry
        currentTerm = heading.text.replace(/\s*\[[^\]]+\]/, "").trim();
        currentDefinition = [];
        collectingEntry = true;
      } else if (collectingEntry) {
        // Hit a different entry, save current and stop collecting
        if (currentTerm && currentDefinition.length > 0) {
          entries.push({
            term: currentTerm,
            definition: currentDefinition.join(" ").trim(),
          });
        }
        currentTerm = "";
        currentDefinition = [];
        collectingEntry = false;
      }
    } else if (collectingEntry) {
      // Collect content for current entry
      if (token.type === "paragraph") {
        const para = token as Tokens.Paragraph;
        currentDefinition.push(para.text);
      } else if (token.type === "list") {
        const list = token as Tokens.List;
        for (const item of list.items) {
          currentDefinition.push("• " + item.text);
        }
      }
    }
  }

  // Save last entry
  if (currentTerm && currentDefinition.length > 0) {
    entries.push({
      term: currentTerm,
      definition: currentDefinition.join(" ").trim(),
    });
  }

  return entries;
}

/**
 * Truncate long definitions to key points
 */
function summarizeDefinition(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;

  // Try to break at a sentence
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let result = "";

  for (const sentence of sentences) {
    if ((result + sentence).length <= maxLength) {
      result += sentence;
    } else {
      break;
    }
  }

  return result.trim() || text.substring(0, maxLength).trim() + "...";
}

/**
 * Generate the glossary markdown
 */
function generateGlossaryMarkdown(
  conditions: GlossaryEntry[],
  actions: GlossaryEntry[],
): string {
  const lines: string[] = [];

  lines.push("# SRD Quick Reference Glossary");
  lines.push("");
  lines.push("> [!TIP]");
  lines.push("> Quick lookup for Conditions, Actions, and Core Rules.");
  lines.push("> Auto-generated from SRD Rules Glossary using AST parsing.");
  lines.push("");

  // Conditions section
  if (conditions.length > 0) {
    lines.push("## Conditions");
    for (const entry of conditions) {
      const summary = summarizeDefinition(entry.definition, 200);
      lines.push(`*   **${entry.term}**: ${summary}`);
    }
    lines.push("");
  }

  // Actions section
  if (actions.length > 0) {
    lines.push("## Actions in Combat");
    for (const entry of actions) {
      const summary = summarizeDefinition(entry.definition, 200);
      lines.push(`*   **${entry.term}**: ${summary}`);
    }
    lines.push("");
  }

  // Add manual stable sections
  lines.push("## Ability Scores");
  lines.push(
    "*   **Strength**: Athletics skill. Melee attacks, carrying capacity (15x Str score).",
  );
  lines.push(
    "*   **Dexterity**: Acrobatics, Sleight of Hand, Stealth skills. AC, Initiative, Ranged attacks.",
  );
  lines.push(
    "*   **Constitution**: Hit Points, Concentration saves. No associated skills.",
  );
  lines.push(
    "*   **Intelligence**: Arcana, History, Investigation, Nature, Religion skills.",
  );
  lines.push(
    "*   **Wisdom**: Animal Handling, Insight, Medicine, Perception, Survival skills.",
  );
  lines.push(
    "*   **Charisma**: Deception, Intimidation, Performance, Persuasion skills.",
  );
  lines.push("");

  lines.push("## Cover");
  lines.push("*   **Half Cover**: +2 bonus to AC and Dexterity saving throws.");
  lines.push(
    "*   **Three-Quarters Cover**: +5 bonus to AC and Dexterity saving throws.",
  );
  lines.push(
    "*   **Total Cover**: Cannot be targeted directly by attacks or spells.",
  );
  lines.push("");

  lines.push("## Light & Vision");
  lines.push("*   **Bright Light**: Normal vision for most creatures.");
  lines.push(
    "*   **Dim Light**: Lightly obscured. Disadvantage on Perception checks.",
  );
  lines.push(
    "*   **Darkness**: Heavily obscured. Creatures are effectively Blinded.",
  );
  lines.push(
    "*   **Lightly Obscured**: Dim light, patchy fog. Disadvantage on Perception.",
  );
  lines.push(
    "*   **Heavily Obscured**: Darkness, opaque fog. Blinded condition.",
  );
  lines.push("");

  lines.push("## Resting");
  lines.push(
    "*   **Short Rest**: 1+ hours of downtime. Spend Hit Dice to regain HP. Some class features recharge.",
  );
  lines.push(
    "*   **Long Rest**: 8 hours of sleep/light activity. Regain all HP and Hit Dice (up to half). Most abilities recharge.",
  );
  lines.push("");

  lines.push("## Currency");
  lines.push("*   **Copper (CP)**: 1 CP = base unit");
  lines.push("*   **Silver (SP)**: 1 SP = 10 CP");
  lines.push("*   **Electrum (EP)**: 1 EP = 50 CP");
  lines.push("*   **Gold (GP)**: 1 GP = 100 CP (standard pricing)");
  lines.push("*   **Platinum (PP)**: 1 PP = 1,000 CP");
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("*Source: D&D 5E System Reference Document 5.2.1*");
  lines.push(`*Generated: ${new Date().toISOString()}*`);

  return lines.join("\n");
}

/**
 * Main execution
 */
async function main() {
  console.log("=== SRD Glossary Generator ===\n");
  console.log("Extracting entries from Rules Glossary...\n");

  // Extract conditions
  console.log("Extracting conditions...");
  const conditions = await extractTaggedEntries("Condition");
  console.log(`  Found ${conditions.length} conditions`);

  // Extract actions
  console.log("Extracting actions...");
  const actions = await extractTaggedEntries("Action");
  console.log(`  Found ${actions.length} actions`);

  // Generate markdown
  console.log("\nGenerating glossary markdown...");
  const markdown = generateGlossaryMarkdown(conditions, actions);

  // Write to file
  console.log(`Writing to ${OUTPUT_FILE}...`);
  await Deno.writeTextFile(OUTPUT_FILE, markdown);

  console.log("\n✓ Glossary generation complete!");
  console.log(`  ${conditions.length} conditions`);
  console.log(`  ${actions.length} actions`);
  console.log(`  Total entries: ${conditions.length + actions.length + 27}`); // +27 for manual entries
}

if (import.meta.main) {
  main();
}
