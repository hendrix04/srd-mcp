/**
 * Shared utilities for marked.js AST-based parsing
 *
 * These utilities handle common token navigation and extraction patterns
 * used across multiple parsers.
 */

import type { Token, Tokens } from "marked";

/**
 * Find the index of the next heading at the specified depth
 */
export function findNextHeading(
  tokens: Token[],
  startIndex: number,
  depth: number,
): number | null {
  for (let i = startIndex; i < tokens.length; i++) {
    if (
      tokens[i].type === "heading" &&
      (tokens[i] as Tokens.Heading).depth === depth
    ) {
      return i;
    }
  }
  return null;
}

/**
 * Extract all tokens until the next heading of the same or higher level
 */
export function extractTokensUntilHeading(
  tokens: Token[],
  startIndex: number,
  depth: number,
): Token[] {
  const result: Token[] = [];

  for (let i = startIndex; i < tokens.length; i++) {
    const token = tokens[i];

    // Stop at next heading of same or higher level
    if (token.type === "heading" && (token as Tokens.Heading).depth <= depth) {
      break;
    }

    result.push(token);
  }

  return result;
}

/**
 * Find all tokens of a specific type
 */
export function findTokensByType<T extends Token>(
  tokens: Token[],
  type: string,
): T[] {
  return tokens.filter((t) => t.type === type) as T[];
}

/**
 * Extract plain text from a token array, handling inline formatting
 */
export function extractPlainText(tokens: Token[]): string {
  const parts: string[] = [];

  for (const token of tokens) {
    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      parts.push(para.text);
    } else if (token.type === "text") {
      const text = token as Tokens.Text;
      parts.push(text.text);
    } else if (token.type === "list") {
      const list = token as Tokens.List;
      for (const item of list.items) {
        parts.push("• " + item.text);
      }
    }
  }

  return parts.join("\n\n").trim();
}

/**
 * Extract list items from a list token
 */
export function extractListItems(token: Tokens.List): string[] {
  return token.items.map((item) => item.text.trim());
}

/**
 * Parse a comma-separated list with normalization
 */
export function parseCommaSeparatedList(
  text: string,
  options?: { splitOn?: RegExp; normalize?: (s: string) => string },
): string[] {
  const splitOn = options?.splitOn || /,\s*(?:and\s+)?|(?:\s+and\s+)/;
  const normalize = options?.normalize || ((s) => s.trim());

  return text
    .split(splitOn)
    .map(normalize)
    .filter((s) => s.length > 0);
}

/**
 * Extract data from a table token
 */
export function extractTableData(
  token: Tokens.Table,
): Array<Record<string, string>> {
  const result: Array<Record<string, string>> = [];

  // Normalize headers (lowercase, trim)
  const headers = token.header.map((h) => h.text.toLowerCase().trim());

  // Parse each row
  for (const row of token.rows) {
    const rowData: Record<string, string> = {};

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const cell = row[i];

      if (cell) {
        rowData[header] = cell.text.trim();
      }
    }

    result.push(rowData);
  }

  return result;
}

/**
 * Normalize item name (remove artifacts like costs in parentheses)
 */
export function normalizeItemName(name: string): string {
  // Remove costs like "(10 GP)" or "(1 GP)"
  name = name.replace(/\s*\(\d+\s*(?:GP|SP|CP)\)/gi, "");

  // Remove trailing periods
  name = name.replace(/\.$/, "");

  return name.trim();
}

/**
 * Parse dice notation from text (e.g., "1d8" from "1d8 per level")
 */
export function parseDiceNotation(text: string): string | null {
  const match = text.match(/\d+d\d+/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Extract text content from blockquote
 */
export function extractBlockquoteText(token: Tokens.Blockquote): string {
  const parts: string[] = [];

  for (const subToken of token.tokens) {
    if (subToken.type === "paragraph") {
      parts.push((subToken as Tokens.Paragraph).text);
    }
  }

  return parts.join("\n\n").trim();
}

/**
 * Find section by header text pattern
 */
export function findSectionByPattern(
  tokens: Token[],
  pattern: RegExp,
  depth: number = 2,
): { startIndex: number; tokens: Token[] } | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading") {
      const heading = token as Tokens.Heading;

      if (heading.depth === depth && pattern.test(heading.text)) {
        const sectionTokens = extractTokensUntilHeading(tokens, i + 1, depth);
        return { startIndex: i, tokens: sectionTokens };
      }
    }
  }

  return null;
}

/**
 * Convert tokens back to markdown format
 */
export function tokensToMarkdown(tokens: Token[]): string {
  const parts: string[] = [];

  for (const token of tokens) {
    if (token.type === "heading") {
      const heading = token as Tokens.Heading;
      const prefix = "#".repeat(heading.depth);
      parts.push(`${prefix} ${heading.text}`);
    } else if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      parts.push(para.text);
    } else if (token.type === "list") {
      const list = token as Tokens.List;
      const listItems = list.items.map((item) => {
        const marker = list.ordered ? "1." : "-";
        return `${marker} ${item.text}`;
      });
      parts.push(listItems.join("\n"));
    } else if (token.type === "table") {
      const table = token as Tokens.Table;
      // Create markdown table
      const headers = table.header.map((h) => h.text).join(" | ");
      const separator = table.header.map(() => "---").join(" | ");
      const rows = table.rows.map((row) =>
        row.map((cell) => cell.text).join(" | "),
      );
      parts.push(`| ${headers} |`);
      parts.push(`| ${separator} |`);
      for (const row of rows) {
        parts.push(`| ${row} |`);
      }
    } else if (token.type === "blockquote") {
      const blockquote = token as Tokens.Blockquote;
      const text = extractBlockquoteText(blockquote);
      parts.push(`> ${text.split("\n").join("\n> ")}`);
    } else if (token.type === "code") {
      const code = token as Tokens.Code;
      parts.push(`\`\`\`${code.lang || ""}\n${code.text}\n\`\`\``);
    }
  }

  return parts.join("\n\n");
}
