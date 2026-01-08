/**
 * Markdown Normalization Tool
 *
 * Copies SRD markdown files to a normalized directory, applying transformations
 * to standardize formatting for easier parsing.
 *
 * Key principles:
 * - Always works on copies, never modifies originals
 * - Wipes output directory on each run for clean state
 * - Modular normalizers that can be enabled/disabled
 * - Verbose logging for debugging
 */

import { ensureDir, emptyDir } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { join, basename } from "https://deno.land/std@0.208.0/path/mod.ts";

// Configuration
const SOURCE_DIR = "srd_reference/DnD5eSRD_md";
const OUTPUT_DIR = "srd_reference/normalized";

// All SRD files to normalize
const ALL_FILES = [
  "DND5eSRD_001-018.md",
  "DND5eSRD_019-035.md",
  "DND5eSRD_036-046.md",
  "DND5eSRD_047-063.md",
  "DND5eSRD_064-076.md",
  "DND5eSRD_077-086.md",
  "DND5eSRD_087-103.md",
  "DND5eSRD_104-120.md",
  "DND5eSRD_121-137.md",
  "DND5eSRD_138-154.md",
  "DND5eSRD_155-175.md",
  "DND5eSRD_176-191.md",
  "DND5eSRD_192-203.md",
  "DND5eSRD_204-229.md",
  "DND5eSRD_230-252.md",
  "DND5eSRD_253-272.md",
  "DND5eSRD_273-292.md",
  "DND5eSRD_293-312.md",
  "DND5eSRD_313-332.md",
  "DND5eSRD_333-364.md",
];

interface NormalizerResult {
  content: string;
  changes: string[];
}

type Normalizer = (content: string, fileName: string) => NormalizerResult;

/**
 * Remove page break markers and page numbers
 */
const removePageBreaks: Normalizer = (content, _fileName) => {
  const changes: string[] = [];
  let result = content;

  // Remove "---\n##" page break patterns (keep the header)
  const pageBreakCount = (result.match(/^---\n\d+/gm) || []).length;
  result = result.replace(/^---\n\d+\n?/gm, "");
  if (pageBreakCount > 0) {
    changes.push(`Removed ${pageBreakCount} page breaks with numbers`);
  }

  // Remove standalone page numbers (just a number on its own line)
  const standaloneNumbers = (result.match(/^\d+\n(?=\n|$)/gm) || []).length;
  result = result.replace(/^\d+\n(?=\n|$)/gm, "");
  if (standaloneNumbers > 0) {
    changes.push(`Removed ${standaloneNumbers} standalone page numbers`);
  }

  // Remove "System Reference Document 5.2.1" lines
  const srdLines = (
    result.match(/^System Reference Document \d+\.\d+(?:\.\d+)?\n?/gm) || []
  ).length;
  result = result.replace(
    /^System Reference Document \d+\.\d+(?:\.\d+)?\n?/gm,
    "",
  );
  if (srdLines > 0) {
    changes.push(`Removed ${srdLines} SRD version lines`);
  }

  return { content: result, changes };
};

/**
 * Normalize multiple consecutive blank lines to maximum of 2
 */
const normalizeBlankLines: Normalizer = (content, _fileName) => {
  const changes: string[] = [];
  const before = content;

  const result = content.replace(/\n{4,}/g, "\n\n\n");

  if (result !== before) {
    changes.push("Normalized excessive blank lines");
  }

  return { content: result, changes };
};

/**
 * Standardize class header levels
 * - Main class name should be ## (level 2)
 * - Subheadings should be ### (level 3)
 * - Feature headers should be #### (level 4)
 */
const normalizeClassHeaders: Normalizer = (content, fileName) => {
  const changes: string[] = [];
  let result = content;

  const classNames = [
    "Barbarian",
    "Bard",
    "Cleric",
    "Druid",
    "Fighter",
    "Monk",
    "Paladin",
    "Ranger",
    "Rogue",
    "Sorcerer",
    "Warlock",
    "Wizard",
  ];

  for (const className of classNames) {
    // Convert # ClassName to ## ClassName (if it's just the class name)
    const singleHashRegex = new RegExp(`^# (${className})\\s*$`, "gm");
    if (singleHashRegex.test(result)) {
      result = result.replace(singleHashRegex, `## $1`);
      changes.push(`Normalized ${className} header to level 2`);
    }
  }

  return { content: result, changes };
};

/**
 * Normalize table header formats
 * Standardizes column names across different table styles
 */
const normalizeTableHeaders: Normalizer = (content, _fileName) => {
  const changes: string[] = [];
  let result = content;

  // Remove <center> tags from table headers
  const centerTagCount = (result.match(/<\/?center>/gi) || []).length;
  result = result.replace(/<\/?center>/gi, "");
  if (centerTagCount > 0) {
    changes.push(`Removed ${centerTagCount} <center> tags`);
  }

  return { content: result, changes };
};

/**
 * Fix multi-row table headers (like Cleric's progression table)
 * Converts problematic headers like:
 *   | | **Proficiency** | | **Channel** | | **Prepared** | —Spell Slots— | | | |
 *   | :-: | :---: | :--- | :---: | :---: | :---: | :---: | ...
 *   | **Level** | **Bonus** | **Class Features** | **Divinity** | **Cantrips** | **Spells** | **1** | **2** | ...
 *
 * Into a single clean header row like Barbarian's:
 *   | Level | Prof. Bonus | Class Features | Channel Divinity | Cantrips | Prepared Spells | 1 | 2 | ...
 */
const fixMultiRowTableHeaders: Normalizer = (content, _fileName) => {
  const changes: string[] = [];
  const lines = content.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect a problematic multi-row header pattern:
    // Line 1: Partial header with some empty cells and grouped labels
    // Line 2: Alignment row (|:---|:---|...)
    // Line 3: Actual column names (|**Level**|**Bonus**|...)

    if (
      line.includes("|") &&
      i + 2 < lines.length &&
      lines[i + 1].match(/^\|[\s:-]+\|/) && // alignment row
      lines[i + 2].includes("**Level**") // actual header row
    ) {
      // This is a multi-row header - extract the real column names from line 3
      const actualHeaderLine = lines[i + 2];
      const alignmentLine = lines[i + 1];

      // Parse the actual header row to get column names
      const cells = actualHeaderLine
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
        .map((c) => c.replace(/\*\*/g, "")); // Remove bold markers

      // Build a clean single-row header
      // Map known column names to standardized versions
      const standardizedCells = cells.map((cell) => {
        if (cell === "Level") return "Level";
        if (cell === "Bonus") return "Prof. Bonus";
        if (cell === "Class Features") return "Class Features";
        if (cell === "Divinity") return "Channel Divinity";
        if (cell === "Cantrips") return "Cantrips";
        if (cell === "Spells") return "Prepared Spells";
        // Spell slot columns (1-9)
        if (/^\d$/.test(cell)) return `Slot ${cell}`;
        return cell;
      });

      // Create new clean header row
      const newHeaderLine = "| " + standardizedCells.join(" | ") + " |";

      // Create matching alignment row
      const newAlignmentLine =
        "|" + standardizedCells.map(() => " :--- ").join("|") + "|";

      result.push(newHeaderLine);
      result.push(newAlignmentLine);

      changes.push(`Fixed multi-row table header (${cells.length} columns)`);

      // Skip the 3 original lines (partial header, alignment, actual header)
      i += 3;
      continue;
    }

    result.push(line);
    i++;
  }

  return { content: result.join("\n"), changes };
};

/**
 * Remove <br> tags and stray formatting
 */
const removeHtmlTags: Normalizer = (content, _fileName) => {
  const changes: string[] = [];
  let result = content;

  // Remove <br> tags
  const brCount = (result.match(/<br\s*\/?>/gi) || []).length;
  result = result.replace(/<br\s*\/?>/gi, "");
  if (brCount > 0) {
    changes.push(`Removed ${brCount} <br> tags`);
  }

  return { content: result, changes };
};

/**
 * Merge "## Core X Traits" headers into the class section
 * Some files have:
 *   ## Fighter
 *   ## Core Fighter Traits
 *   | table... |
 *
 * We want:
 *   ## Fighter
 *   | Core Fighter Traits | |
 *   | table... |
 *
 * This ensures the Core Traits table is part of the main class section
 */
const mergeCoreTraitsHeaders: Normalizer = (content, _fileName) => {
  const changes: string[] = [];
  let result = content;

  const classNames = [
    "Barbarian",
    "Bard",
    "Cleric",
    "Druid",
    "Fighter",
    "Monk",
    "Paladin",
    "Ranger",
    "Rogue",
    "Sorcerer",
    "Warlock",
    "Wizard",
  ];

  for (const className of classNames) {
    // Match pattern: ## ClassName\n## Core ClassName Traits
    // Replace with: ## ClassName\n(keep the table that follows)
    const pattern = new RegExp(
      `^(## ${className})\\s*\\n+## Core ${className} Traits\\s*\\n`,
      "gm",
    );

    if (pattern.test(result)) {
      // Replace the separate header with just the class header
      // The table that follows will remain
      result = result.replace(pattern, `$1\n\n`);
      changes.push(`Merged Core ${className} Traits into ${className} section`);
    }
  }

  return { content: result, changes };
};

/**
 * Main normalization pipeline
 */
async function normalizeFile(
  sourcePath: string,
  outputPath: string,
  normalizers: Normalizer[],
): Promise<void> {
  const fileName = basename(sourcePath);
  console.log(`\nProcessing: ${fileName}`);

  let content = await Deno.readTextFile(sourcePath);
  const allChanges: string[] = [];

  for (const normalizer of normalizers) {
    const { content: newContent, changes } = normalizer(content, fileName);
    content = newContent;
    allChanges.push(...changes);
  }

  // Write normalized content
  await Deno.writeTextFile(outputPath, content);

  if (allChanges.length > 0) {
    console.log(`  Changes applied:`);
    for (const change of allChanges) {
      console.log(`    - ${change}`);
    }
  } else {
    console.log(`  No changes needed`);
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log("=== SRD Markdown Normalization Tool ===\n");
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Wipe and recreate output directory
  console.log("\nWiping output directory...");
  await ensureDir(OUTPUT_DIR);
  await emptyDir(OUTPUT_DIR);
  console.log("Output directory cleaned.");

  // Define normalizers to apply (order matters!)
  const normalizers: Normalizer[] = [
    removePageBreaks,
    removeHtmlTags,
    normalizeBlankLines,
    normalizeClassHeaders,
    mergeCoreTraitsHeaders,
    normalizeTableHeaders,
    fixMultiRowTableHeaders,
  ];

  console.log(`\nApplying ${normalizers.length} normalizers...`);

  // Process all SRD files
  console.log("\n--- Processing All SRD Files ---");
  for (const fileName of ALL_FILES) {
    const sourcePath = join(SOURCE_DIR, fileName);
    const outputPath = join(OUTPUT_DIR, fileName);

    try {
      await normalizeFile(sourcePath, outputPath, normalizers);
    } catch (error) {
      console.error(`  Error processing ${fileName}: ${error}`);
    }
  }

  console.log("\n=== Normalization Complete ===");
  console.log(`Normalized files written to: ${OUTPUT_DIR}`);
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export {
  normalizeFile,
  removePageBreaks,
  removeHtmlTags,
  normalizeBlankLines,
  normalizeClassHeaders,
  mergeCoreTraitsHeaders,
  normalizeTableHeaders,
  fixMultiRowTableHeaders,
};
export type { Normalizer, NormalizerResult };
