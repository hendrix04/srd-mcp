import type { CombatRules } from "../../src/types/rule-types.ts";

/**
 * Parse combat rules from the glossary
 */
export async function parseRules(glossaryPath: string, outputDir: string): Promise<void> {
  try {
    const content = await Deno.readTextFile(glossaryPath);
    const rules = extractRules(content);

    const outputPath = `${outputDir}/combat-rules.json`;
    await Deno.writeTextFile(outputPath, JSON.stringify(rules, null, 2));

    console.log("  Parsed combat rules from glossary");
  } catch (error) {
    console.error(`  Error parsing rules: ${error}`);
  }
}

/**
 * Extract rules from glossary markdown
 */
function extractRules(markdown: string): CombatRules {
  const rules: CombatRules = {
    actions: {},
    conditions: {},
    cover: {},
  };

  // Extract conditions
  const conditionsMatch = markdown.match(/## Conditions \(Brief\)([\s\S]+?)(?=\n##|$)/);
  if (conditionsMatch) {
    const conditionsText = conditionsMatch[1];
    const conditionMatches = conditionsText.matchAll(/\*\s+\*\*([^*]+):\*\*\s*(.+)/g);

    for (const match of conditionMatches) {
      const name = match[1].trim();
      const description = match[2].trim();
      rules.conditions[name] = description;
    }
  }

  // Extract actions
  const actionsMatch = markdown.match(/## Actions in Combat([\s\S]+?)(?=\n##|$)/);
  if (actionsMatch) {
    const actionsText = actionsMatch[1];
    const actionMatches = actionsText.matchAll(/\*\s+\*\*([^*]+):\*\*\s*(.+)/g);

    for (const match of actionMatches) {
      const name = match[1].trim();
      const description = match[2].trim();
      rules.actions[name] = description;
    }
  }

  // Extract cover
  const coverMatch = markdown.match(/## Cover([\s\S]+?)(?=\n##|$)/);
  if (coverMatch) {
    const coverText = coverMatch[1];
    const coverMatches = coverText.matchAll(/\*\s+\*\*([^*]+):\*\*\s*(.+)/g);

    for (const match of coverMatches) {
      const name = match[1].trim();
      const description = match[2].trim();
      rules.cover![name] = description;
    }
  }

  return rules;
}
