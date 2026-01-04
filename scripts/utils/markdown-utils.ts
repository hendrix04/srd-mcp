/**
 * Utility functions for parsing markdown content
 */

/**
 * Extract sections from markdown based on header level
 */
export function extractSections(markdown: string, headerLevel: number): Map<string, string> {
  const sections = new Map<string, string>();
  const headerRegex = new RegExp(`^#{${headerLevel}}\\s+(.+)$`, "gm");
  const matches = Array.from(markdown.matchAll(headerRegex));

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = match[1].trim();
    const startIndex = match.index! + match[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index! : markdown.length;
    const content = markdown.substring(startIndex, endIndex).trim();

    sections.set(title, content);
  }

  return sections;
}

/**
 * Extract a single field from markdown (e.g., "**Casting Time:** Action")
 */
export function extractField(markdown: string, fieldName: string): string | null {
  const regex = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+?)(?=\\n|$)`, "i");
  const match = markdown.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract italic header line (e.g., "*Level 2 Evocation (Wizard)*")
 */
export function extractItalicHeader(markdown: string): string | null {
  const match = markdown.match(/^\*(.+?)\*$/m);
  return match ? match[1].trim() : null;
}

/**
 * Parse components string (e.g., "V, S, M (powdered rhubarb)")
 */
export function parseComponents(componentsStr: string): {
  V: boolean;
  S: boolean;
  M: string | null;
} {
  const components = { V: false, S: false, M: null as string | null };

  if (componentsStr.includes("V")) components.V = true;
  if (componentsStr.includes("S")) components.S = true;

  const materialMatch = componentsStr.match(/M\s*\(([^)]+)\)/);
  if (materialMatch) {
    components.M = materialMatch[1].trim();
  } else if (componentsStr.includes("M")) {
    components.M = "material component required";
  }

  return components;
}

/**
 * Check if duration includes concentration
 */
export function isConcentration(duration: string): boolean {
  return duration.toLowerCase().includes("concentration");
}

/**
 * Check if casting time includes ritual
 */
export function isRitual(castingTime: string): boolean {
  return castingTime.toLowerCase().includes("ritual");
}

/**
 * Extract spell level and school from italic header
 * e.g., "Level 2 Evocation (Wizard)" -> { level: 2, school: "Evocation", classes: ["Wizard"] }
 */
export function parseSpellHeader(header: string): {
  level: number;
  school: string;
  classes: string[];
} | null {
  // Match patterns like "Level 2 Evocation (Wizard, Sorcerer)" or "Evocation Cantrip (Wizard)"
  const levelMatch = header.match(/Level\s+(\d+)\s+(\w+)/i);
  const cantripMatch = header.match(/(\w+)\s+Cantrip/i);

  let level: number;
  let school: string;

  if (levelMatch) {
    level = parseInt(levelMatch[1]);
    school = levelMatch[2];
  } else if (cantripMatch) {
    level = 0;
    school = cantripMatch[1];
  } else {
    return null;
  }

  // Extract classes from parentheses
  const classesMatch = header.match(/\(([^)]+)\)/);
  const classes = classesMatch
    ? classesMatch[1].split(",").map((c) => c.trim())
    : [];

  return { level, school, classes };
}

/**
 * Clean up description text (remove extra whitespace, normalize)
 */
export function cleanDescription(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
    .replace(/[ \t]+/g, " ") // Normalize spaces
    .trim();
}

/**
 * Extract markdown table into array of objects
 */
export function parseMarkdownTable(markdown: string): Array<Record<string, string>> {
  const lines = markdown.split("\n").filter((line) => line.trim().startsWith("|"));
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0]
    .split("|")
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  // Skip separator line, parse data rows
  const rows = lines.slice(2);
  const data: Array<Record<string, string>> = [];

  for (const row of rows) {
    const values = row
      .split("|")
      .map((v) => v.trim())
      .filter((v, i, arr) => i > 0 && i < arr.length - 1); // Skip first/last empty

    if (values.length === headers.length) {
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });
      data.push(rowData);
    }
  }

  return data;
}

/**
 * Get line number of a pattern match in text
 */
export function getLineNumber(text: string, pattern: RegExp): number | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return i + 1; // Line numbers start at 1
    }
  }
  return null;
}
