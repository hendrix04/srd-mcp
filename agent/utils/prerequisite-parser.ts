/**
 * Utility for parsing D&D 5e SRD prerequisite strings.
 */

export interface PrerequisiteRule {
  type: "level" | "ability" | "feature" | "composite";
  operator?: "and" | "or";
  rules?: PrerequisiteRule[];
  value?: number | string;
  ability?: string;
}

/**
 * Parses a prerequisite string into a structured rule tree.
 * Examples: 
 * - "Level 4+"
 * - "Level 4+, Strength or Dexterity 13+"
 * - "Fighting Style Feature"
 */
export function parsePrerequisite(prereq: string): PrerequisiteRule | null {
  if (!prereq || prereq.trim() === "") return null;

  const parts = prereq.split(",").map(p => p.trim());
  
  if (parts.length > 1) {
    return {
      type: "composite",
      operator: "and",
      rules: parts.map(p => parseSingleRule(p)).filter((r): r is PrerequisiteRule => r !== null)
    };
  }

  return parseSingleRule(parts[0]);
}

function parseSingleRule(rule: string): PrerequisiteRule | null {
  const levelMatch = rule.match(/Level\s+(\d+)\+/i);
  if (levelMatch) {
    return { type: "level", value: parseInt(levelMatch[1], 10) };
  }

  const abilityMatch = rule.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?:\s+or\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma))?\s+(\d+)\+/i);
  if (abilityMatch) {
    const score = parseInt(abilityMatch[3], 10);
    if (abilityMatch[2]) {
      return {
        type: "composite",
        operator: "or",
        rules: [
          { type: "ability", ability: abilityMatch[1], value: score },
          { type: "ability", ability: abilityMatch[2], value: score }
        ]
      };
    }
    return { type: "ability", ability: abilityMatch[1], value: score };
  }

  if (rule.toLowerCase().includes("feature")) {
    return { type: "feature", value: rule };
  }

  return { type: "feature", value: rule };
}
