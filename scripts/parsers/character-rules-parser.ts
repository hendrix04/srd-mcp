/**
 * Character Rules Parser V2
 *
 * Parses character creation rules, advancement, multiclassing, and combat rules
 * from the SRD into fully structured JSON (no raw markdown content fields).
 *
 * Merges content from:
 * - DND5eSRD_019-035.md (character creation, advancement, multiclassing)
 * - srd_glossary.md (conditions, actions, cover, etc.)
 */

import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type {
  AbilityScoreGenerationMethod,
  AbilityScoreReference,
  Action,
  Alignment,
  CharacterRules,
  ClassOverview,
  Condition,
  CoverType,
  CurrencyType,
  HitPointsByClass,
  Language,
  LevelAdvancement,
  LevelUpStep,
  LightLevel,
  MulticlassingPrerequisite,
  MulticlassSpellSlots,
  RestType,
  StandardArrayByClass,
  HigherLevelStartingEquipment,
  TierOfPlay,
  Trinket,
} from "../../src/types/character-rules-types.ts";
import { extractTableData } from "../utils/parser-utils.ts";

// =============================================================================
// Table Parsing Helpers
// =============================================================================

function findTable(tokens: Token[], afterIndex: number): Tokens.Table | null {
  for (let i = afterIndex + 1; i < tokens.length; i++) {
    if (tokens[i].type === "table") {
      return tokens[i] as Tokens.Table;
    }
    if (tokens[i].type === "heading") {
      break; // Stop at next heading
    }
  }
  return null;
}

function findHeadingIndex(
  tokens: Token[],
  text: string | RegExp,
  depth?: number,
): number {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "heading") {
      const heading = token as Tokens.Heading;
      if (depth !== undefined && heading.depth !== depth) continue;

      if (typeof text === "string") {
        if (heading.text === text || heading.text.includes(text)) return i;
      } else {
        if (text.test(heading.text)) return i;
      }
    }
  }
  return -1;
}

// =============================================================================
// Class Overview Table (Step 1)
// =============================================================================

function parseClassOverview(tokens: Token[]): ClassOverview[] {
  const idx = findHeadingIndex(tokens, "Class Overview", 3);
  if (idx === -1) return [];

  const table = findTable(tokens, idx);
  if (!table) return [];

  const results: ClassOverview[] = [];
  for (const row of table.rows) {
    if (row.length >= 4) {
      results.push({
        className: row[0].text.trim(),
        likes: row[1].text.trim(),
        primaryAbility: row[2].text.trim(),
        complexity: row[3].text.trim() as "Low" | "Average" | "High",
      });
    }
  }
  return results;
}

// =============================================================================
// Standard Array by Class Table (Step 3)
// =============================================================================

function parseStandardArrayByClass(tokens: Token[]): StandardArrayByClass[] {
  const idx = findHeadingIndex(tokens, "Standard Array by Class", 4);
  if (idx === -1) return [];

  const table = findTable(tokens, idx);
  if (!table) return [];

  const results: StandardArrayByClass[] = [];
  for (const row of table.rows) {
    if (row.length >= 7) {
      results.push({
        className: row[0].text.trim(),
        strength: parseInt(row[1].text.trim()) || 0,
        dexterity: parseInt(row[2].text.trim()) || 0,
        constitution: parseInt(row[3].text.trim()) || 0,
        intelligence: parseInt(row[4].text.trim()) || 0,
        wisdom: parseInt(row[5].text.trim()) || 0,
        charisma: parseInt(row[6].text.trim()) || 0,
      });
    }
  }
  return results;
}

// =============================================================================
// Hit Points by Class Tables (Step 5)
// =============================================================================

function parseHitPointsByClass(tokens: Token[]): HitPointsByClass[] {
  // Parse Level 1 Hit Points table
  const level1Idx = findHeadingIndex(tokens, "Level 1 Hit Points by Class", 4);
  const fixedIdx = findHeadingIndex(tokens, "Fixed Hit Points by Class", 3);

  const level1Table = level1Idx !== -1 ? findTable(tokens, level1Idx) : null;
  const fixedTable = fixedIdx !== -1 ? findTable(tokens, fixedIdx) : null;

  // Build map of class -> hit points info
  const classMap = new Map<string, Partial<HitPointsByClass>>();

  // Hit die by class (standard D&D 5e values)
  const hitDice: Record<string, number> = {
    Barbarian: 12,
    Fighter: 10,
    Paladin: 10,
    Ranger: 10,
    Bard: 8,
    Cleric: 8,
    Druid: 8,
    Monk: 8,
    Rogue: 8,
    Warlock: 8,
    Sorcerer: 6,
    Wizard: 6,
  };

  // Parse Level 1 table
  if (level1Table) {
    for (const row of level1Table.rows) {
      if (row.length >= 2) {
        const classNames = row[0].text.trim();
        const hp = row[1].text.trim();

        // Handle "Fighter, Paladin, or Ranger" style entries
        const classes = classNames
          .split(/,\s*(?:or\s+)?|\s+or\s+/)
          .map((c) => c.trim());
        for (const className of classes) {
          if (className && hitDice[className]) {
            classMap.set(className, {
              className,
              hitDie: hitDice[className],
              level1HitPoints: hp,
            });
          }
        }
      }
    }
  }

  // Parse Fixed Hit Points table
  if (fixedTable) {
    for (const row of fixedTable.rows) {
      if (row.length >= 2) {
        const classNames = row[0].text.trim();
        const hp = row[1].text.trim();

        const classes = classNames
          .split(/,\s*(?:or\s+)?|\s+or\s+/)
          .map((c) => c.trim());
        for (const className of classes) {
          if (className) {
            const existing = classMap.get(className) || {
              className,
              hitDie: hitDice[className] || 8,
            };
            existing.fixedPerLevel = hp;
            classMap.set(className, existing);
          }
        }
      }
    }
  }

  // Convert to array, sorted by class name
  return Array.from(classMap.values())
    .filter((hp) => hp.className && hp.hitDie)
    .sort((a, b) =>
      a.className!.localeCompare(b.className!),
    ) as HitPointsByClass[];
}

// =============================================================================
// Alignments (Step 4)
// =============================================================================

function parseAlignments(tokens: Token[]): Alignment[] {
  const idx = findHeadingIndex(tokens, "The Nine Alignments", 3);
  if (idx === -1) return [];

  const alignments: Alignment[] = [];
  const alignmentCodes: Record<string, string> = {
    "Lawful Good": "LG",
    "Neutral Good": "NG",
    "Chaotic Good": "CG",
    "Lawful Neutral": "LN",
    Neutral: "N",
    "Chaotic Neutral": "CN",
    "Lawful Evil": "LE",
    "Neutral Evil": "NE",
    "Chaotic Evil": "CE",
  };

  // Find paragraphs with bold alignment names
  for (let i = idx + 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading" && (token as Tokens.Heading).depth <= 3) {
      break;
    }

    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      const text = para.text;

      // Match "**Lawful Good (LG).**" or "**Neutral (N).**" pattern
      const match = text.match(/^\*\*([^(]+)\s*\(([A-Z]+)\)\.\*\*\s*(.+)$/);
      if (match) {
        alignments.push({
          name: match[1].trim(),
          code: match[2].trim(),
          description: match[3].trim(),
        });
      }
    }
  }

  return alignments;
}

// =============================================================================
// Languages (Step 2)
// =============================================================================

function parseLanguages(tokens: Token[]): {
  standard: Language[];
  rare: Language[];
} {
  const standard: Language[] = [];
  const rare: Language[] = [];

  // Standard Languages table
  const stdIdx = findHeadingIndex(tokens, "Standard Languages", 4);
  if (stdIdx !== -1) {
    const table = findTable(tokens, stdIdx);
    if (table) {
      for (const row of table.rows) {
        const roll = row[0]?.text.trim() || "";
        const name = row[1]?.text.trim() || "";
        if (name) {
          const lang: Language = { name };
          if (roll && roll !== "—") {
            lang.roll = roll;
          }
          standard.push(lang);
        }
      }
    }
  }

  // Rare Languages table
  const rareIdx = findHeadingIndex(tokens, "Rare Languages", 4);
  if (rareIdx !== -1) {
    const table = findTable(tokens, rareIdx);
    if (table) {
      // This table has 2 language columns side by side
      for (const row of table.rows) {
        if (row[0]?.text.trim()) {
          const name = row[0].text.trim();
          const lang: Language = { name };
          if (name.includes("*")) {
            lang.name = name.replace(/\*+/g, "").trim();
            lang.notes =
              "Primordial includes Aquan, Auran, Ignan, and Terran dialects";
          }
          rare.push(lang);
        }
        if (row[1]?.text.trim()) {
          const name = row[1].text.trim();
          const lang: Language = { name };
          if (name.includes("*")) {
            lang.name = name.replace(/\*+/g, "").trim();
            lang.notes =
              "Primordial includes Aquan, Auran, Ignan, and Terran dialects";
          }
          rare.push(lang);
        }
      }
    }
  }

  return { standard, rare };
}

// =============================================================================
// Starting Equipment at Higher Levels
// =============================================================================

function parseHigherLevelStartingEquipment(
  tokens: Token[],
): HigherLevelStartingEquipment[] {
  const idx = findHeadingIndex(
    tokens,
    "Starting Equipment at Higher Levels",
    4,
  );
  if (idx === -1) return [];

  const table = findTable(tokens, idx);
  if (!table) return [];

  const results: HigherLevelStartingEquipment[] = [];
  for (const row of table.rows) {
    if (row.length >= 3) {
      results.push({
        levelRange: row[0].text.trim(),
        equipmentAndMoney: row[1].text.trim(),
        magicItems: row[2].text.trim(),
      });
    }
  }
  return results;
}

// =============================================================================
// Trinkets Table
// =============================================================================

function parseTrinkets(tokens: Token[]): Trinket[] {
  const idx = findHeadingIndex(tokens, "Trinkets", 2);
  if (idx === -1) return [];

  const trinkets: Trinket[] = [];

  // Find all tables after the Trinkets heading
  for (let i = idx + 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading" && (token as Tokens.Heading).depth <= 2) {
      break;
    }

    if (token.type === "table") {
      const table = token as Tokens.Table;
      for (const row of table.rows) {
        if (row.length >= 2) {
          const roll = parseInt(row[0].text.trim());
          const description = row[1].text.trim();
          if (!isNaN(roll) && description) {
            trinkets.push({ roll, description });
          }
        }
      }
    }
  }

  return trinkets.sort((a, b) => a.roll - b.roll);
}

// =============================================================================
// Ability Score Generation Methods
// =============================================================================

function parseAbilityScoreGeneration(
  tokens: Token[],
): AbilityScoreGenerationMethod[] {
  const methods: AbilityScoreGenerationMethod[] = [];
  const idx = findHeadingIndex(tokens, "Generate Your Scores", 3);
  if (idx === -1) return methods;

  // Find Point Cost table for point costs
  const pointCostIdx = findHeadingIndex(tokens, "Ability Score Point Costs", 4);
  const pointCostTable =
    pointCostIdx !== -1 ? findTable(tokens, pointCostIdx) : null;
  const pointCosts: Record<number, number> = {};

  if (pointCostTable) {
    for (const row of pointCostTable.rows) {
      // Table has 4 columns: Score | Cost | Score | Cost
      if (row[0] && row[1]) {
        const score = parseInt(row[0].text.trim());
        const cost = parseInt(row[1].text.trim());
        if (!isNaN(score) && !isNaN(cost)) {
          pointCosts[score] = cost;
        }
      }
      if (row[2] && row[3]) {
        const score = parseInt(row[2].text.trim());
        const cost = parseInt(row[3].text.trim());
        if (!isNaN(score) && !isNaN(cost)) {
          pointCosts[score] = cost;
        }
      }
    }
  }

  // Parse method descriptions from paragraphs
  for (let i = idx + 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading" && (token as Tokens.Heading).depth <= 3) {
      break;
    }

    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph;
      const text = para.text;

      if (text.startsWith("**Standard Array.**")) {
        const arrayMatch = text.match(
          /(\d+,\s*\d+,\s*\d+,\s*\d+,\s*\d+,\s*\d+)/,
        );
        const standardArray = arrayMatch
          ? arrayMatch[1].split(",").map((s) => parseInt(s.trim()))
          : [15, 14, 13, 12, 10, 8];

        methods.push({
          name: "Standard Array",
          description: text.replace("**Standard Array.**", "").trim(),
          details: { standardArray },
        });
      } else if (text.startsWith("**Random Generation.**")) {
        methods.push({
          name: "Random Generation",
          description: text.replace("**Random Generation.**", "").trim(),
        });
      } else if (text.startsWith("**Point Cost.**")) {
        methods.push({
          name: "Point Cost",
          description: text.replace("**Point Cost.**", "").trim(),
          details: {
            pointBudget: 27,
            pointCosts,
          },
        });
      }
    }
  }

  return methods;
}

// =============================================================================
// Ability Score Modifiers Table
// =============================================================================

function parseAbilityScoreModifiers(tokens: Token[]): Record<number, number> {
  const idx = findHeadingIndex(tokens, "Ability Scores and Modifiers", 4);
  if (idx === -1) return {};

  const table = findTable(tokens, idx);
  if (!table) return {};

  const modifiers: Record<number, number> = {};

  for (const row of table.rows) {
    // Process columns 0-1 and 2-3 (table has Score|Modifier|Score|Modifier)
    for (let col = 0; col < 4; col += 2) {
      const scoreText = row[col]?.text.trim();
      const modText = row[col + 1]?.text.trim();
      if (!scoreText || !modText) continue;

      // Parse modifier (handles +1, −1, etc.)
      const modValue =
        parseInt(modText.replace(/[+−]/g, "").trim()) *
        (modText.includes("−") ? -1 : 1);

      // Handle score ranges like "12–13"
      if (scoreText.includes("–") || scoreText.includes("-")) {
        const [min, max] = scoreText
          .split(/[–-]/)
          .map((s) => parseInt(s.trim()));
        for (let score = min; score <= max; score++) {
          modifiers[score] = modValue;
        }
      } else {
        const score = parseInt(scoreText);
        if (!isNaN(score)) {
          modifiers[score] = modValue;
        }
      }
    }
  }

  return modifiers;
}

// =============================================================================
// Level Advancement Table
// =============================================================================

function parseLevelAdvancement(tokens: Token[]): LevelAdvancement[] {
  const idx = findHeadingIndex(tokens, "Character Advancement", 3);
  if (idx === -1) return [];

  const table = findTable(tokens, idx);
  if (!table) return [];

  const advancement: LevelAdvancement[] = [];
  const tableData = extractTableData(table);

  for (const row of tableData) {
    const level = parseInt(row["level"]);
    const xpText = row["experience points"]?.replace(/,/g, "") || "0";
    const experiencePoints = parseInt(xpText);
    const proficiencyBonus = parseInt(
      row["proficiency bonus"]?.replace("+", "") || "0",
    );

    if (!isNaN(level) && !isNaN(experiencePoints) && !isNaN(proficiencyBonus)) {
      advancement.push({ level, experiencePoints, proficiencyBonus });
    }
  }

  return advancement;
}

// =============================================================================
// Level Up Steps
// =============================================================================

function parseLevelUpSteps(tokens: Token[]): LevelUpStep[] {
  const idx = findHeadingIndex(tokens, "Gaining a Level", 2);
  if (idx === -1) return [];

  const steps: LevelUpStep[] = [
    {
      stepNumber: 1,
      title: "Choose a Class",
      description:
        "Most characters advance in the same class. However, you might decide to gain a level in another class using the multiclassing rules.",
    },
    {
      stepNumber: 2,
      title: "Adjust Hit Points and Hit Dice",
      description:
        "Each time you gain a level, you gain an additional Hit Die. Roll that die, add your Constitution modifier to the roll, and add the total (minimum of 1) to your Hit Point maximum.",
    },
    {
      stepNumber: 3,
      title: "Record New Class Features",
      description:
        "Look at your class features table, and note the features you gain at your new level in that class. Make any choices offered by a new feature.",
    },
    {
      stepNumber: 4,
      title: "Adjust Proficiency Bonus",
      description:
        "When your Proficiency Bonus increases, increase all the numbers on your character sheet that include your Proficiency Bonus.",
    },
    {
      stepNumber: 5,
      title: "Adjust Ability Modifiers",
      description:
        "If you choose a feat that increases one or more of your ability scores, your ability modifier also changes if the new score is an even number.",
    },
  ];

  return steps;
}

// =============================================================================
// Tiers of Play
// =============================================================================

function parseTiersOfPlay(tokens: Token[]): TierOfPlay[] {
  const tiers: TierOfPlay[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading") {
      const heading = token as Tokens.Heading;
      const match = heading.text.match(/Tier (\d+) \(Levels ([\d–-]+)\)/);

      if (match) {
        const tier = parseInt(match[1]);
        const levels = match[2];

        // Get description from next paragraph
        let description = "";
        for (let j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === "paragraph") {
            description = (tokens[j] as Tokens.Paragraph).text;
            break;
          }
          if (tokens[j].type === "heading") break;
        }

        tiers.push({
          tier,
          levels,
          title: heading.text,
          description,
        });
      }
    }
  }

  return tiers;
}

// =============================================================================
// Multiclassing
// =============================================================================

function parseMulticlassing(tokens: Token[]): CharacterRules["multiclassing"] {
  const idx = findHeadingIndex(tokens, "Multiclassing", 2);

  const result: CharacterRules["multiclassing"] = {
    description: "",
    prerequisites: [],
    spellSlots: [],
    rules: {
      experiencePoints: "",
      hitPoints: "",
      proficiencyBonus: "",
      proficiencies: "",
      classFeatures: "",
    },
  };

  if (idx === -1) return result;

  // Get description
  for (let i = idx + 1; i < tokens.length; i++) {
    if (tokens[i].type === "paragraph") {
      result.description = (tokens[i] as Tokens.Paragraph).text;
      break;
    }
    if (tokens[i].type === "heading") break;
  }

  // Prerequisites (hardcoded based on D&D 5e rules)
  result.prerequisites = [
    { className: "Barbarian", primaryAbility: "Strength", minimumScore: 13 },
    { className: "Bard", primaryAbility: "Charisma", minimumScore: 13 },
    { className: "Cleric", primaryAbility: "Wisdom", minimumScore: 13 },
    { className: "Druid", primaryAbility: "Wisdom", minimumScore: 13 },
    {
      className: "Fighter",
      primaryAbility: "Strength or Dexterity",
      minimumScore: 13,
    },
    {
      className: "Monk",
      primaryAbility: "Dexterity and Wisdom",
      minimumScore: 13,
    },
    {
      className: "Paladin",
      primaryAbility: "Strength and Charisma",
      minimumScore: 13,
    },
    {
      className: "Ranger",
      primaryAbility: "Dexterity and Wisdom",
      minimumScore: 13,
    },
    { className: "Rogue", primaryAbility: "Dexterity", minimumScore: 13 },
    { className: "Sorcerer", primaryAbility: "Charisma", minimumScore: 13 },
    { className: "Warlock", primaryAbility: "Charisma", minimumScore: 13 },
    { className: "Wizard", primaryAbility: "Intelligence", minimumScore: 13 },
  ];

  // Parse spell slots table
  const spellTableIdx = findHeadingIndex(tokens, /Multiclass Spellcaster/i, 4);
  if (spellTableIdx !== -1) {
    const table = findTable(tokens, spellTableIdx);
    if (table) {
      for (const row of table.rows) {
        const level = parseInt(row[0]?.text.trim());
        if (isNaN(level)) continue;

        const slots: Record<number, number> = {};
        for (let col = 1; col <= 9 && col < row.length; col++) {
          const slotText = row[col]?.text.trim();
          if (slotText && slotText !== "—") {
            const slotCount = parseInt(slotText);
            if (!isNaN(slotCount)) {
              slots[col] = slotCount;
            }
          }
        }

        if (Object.keys(slots).length > 0) {
          result.spellSlots.push({ level, slots });
        }
      }
    }
  }

  // Parse rule sections
  const ruleHeadings = [
    { heading: "Experience Points", field: "experiencePoints" },
    { heading: "Hit Points and Hit Point Dice", field: "hitPoints" },
    { heading: "Proficiency Bonus", field: "proficiencyBonus" },
    { heading: "Proficiencies", field: "proficiencies" },
    { heading: "Class Features", field: "classFeatures" },
  ];

  for (const { heading, field } of ruleHeadings) {
    const ruleIdx = findHeadingIndex(tokens, heading, 3);
    if (ruleIdx !== -1) {
      const paragraphs: string[] = [];
      for (let i = ruleIdx + 1; i < tokens.length; i++) {
        if (
          tokens[i].type === "heading" &&
          (tokens[i] as Tokens.Heading).depth <= 3
        ) {
          break;
        }
        if (tokens[i].type === "paragraph") {
          paragraphs.push((tokens[i] as Tokens.Paragraph).text);
        }
      }
      (result.rules as Record<string, string>)[field] = paragraphs.join("\n\n");
    }
  }

  return result;
}

// =============================================================================
// Glossary Parsing (merged from rules-parser)
// =============================================================================

function parseGlossarySection(
  content: string,
  sectionName: string,
): Array<{ name: string; description: string }> {
  const results: Array<{ name: string; description: string }> = [];

  const sectionMatch = content.match(
    new RegExp(`## ${sectionName}([\\s\\S]+?)(?=\\n##|$)`),
  );
  if (!sectionMatch) return results;

  const sectionText = sectionMatch[1];
  const itemMatches = sectionText.matchAll(
    /\*\s+\*\*([^*:]+)(?::\*\*|\*\*:)\s*(.+)/g,
  );

  for (const match of itemMatches) {
    results.push({
      name: match[1].trim(),
      description: match[2].trim(),
    });
  }

  return results;
}

function parseConditions(glossaryContent: string): Condition[] {
  return parseGlossarySection(glossaryContent, "Conditions");
}

function parseActions(glossaryContent: string): Action[] {
  return parseGlossarySection(glossaryContent, "Actions in Combat");
}

function parseCover(glossaryContent: string): CoverType[] {
  return parseGlossarySection(glossaryContent, "Cover");
}

function parseAbilityScoresFromGlossary(
  glossaryContent: string,
): AbilityScoreReference[] {
  const items = parseGlossarySection(glossaryContent, "Ability Scores");
  return items.map((item) => {
    // Extract skills from description
    const skillMatch = item.description.match(/^([^.]+)\s+skills?\./i);
    const skills = skillMatch
      ? skillMatch[1].split(/,\s*/).map((s) => s.trim())
      : [];

    return {
      name: item.name,
      skills,
      description: item.description,
    };
  });
}

function parseLightLevels(glossaryContent: string): LightLevel[] {
  return parseGlossarySection(glossaryContent, "Light & Vision");
}

function parseResting(glossaryContent: string): RestType[] {
  return parseGlossarySection(glossaryContent, "Resting");
}

function parseCurrency(glossaryContent: string): CurrencyType[] {
  const items = parseGlossarySection(glossaryContent, "Currency");
  const copperValues: Record<string, number> = {
    "Copper (CP)": 1,
    "Silver (SP)": 10,
    "Electrum (EP)": 50,
    "Gold (GP)": 100,
    "Platinum (PP)": 1000,
  };

  return items.map((item) => {
    const abbrevMatch = item.name.match(/\(([A-Z]+)\)/);
    return {
      name: item.name.replace(/\s*\([A-Z]+\)/, "").trim(),
      abbreviation: abbrevMatch ? abbrevMatch[1] : "",
      copperValue: copperValues[item.name] || 0,
    };
  });
}

// =============================================================================
// Main Export
// =============================================================================

export async function parseCharacterRules(
  inputDir: string,
  glossaryPath: string,
  outputDir: string,
): Promise<void> {
  console.log("  Parsing character rules...");

  // Read character creation file
  const filePath = `${inputDir}/DND5eSRD_019-035.md`;
  const content = await Deno.readTextFile(filePath);
  const tokens = marked.lexer(content);

  // Read glossary
  const glossaryContent = await Deno.readTextFile(glossaryPath);

  // Parse all sections
  const classOverview = parseClassOverview(tokens);
  const standardArrayByClass = parseStandardArrayByClass(tokens);
  const hitPointsByClass = parseHitPointsByClass(tokens);
  const alignments = parseAlignments(tokens);
  const languages = parseLanguages(tokens);
  const higherLevelStartingEquipment =
    parseHigherLevelStartingEquipment(tokens);
  const trinkets = parseTrinkets(tokens);
  const abilityScoreGeneration = parseAbilityScoreGeneration(tokens);
  const abilityScoreModifiers = parseAbilityScoreModifiers(tokens);
  const levelAdvancement = parseLevelAdvancement(tokens);
  const levelUpSteps = parseLevelUpSteps(tokens);
  const tiersOfPlay = parseTiersOfPlay(tokens);
  const multiclassing = parseMulticlassing(tokens);

  // Parse glossary sections
  const conditions = parseConditions(glossaryContent);
  const actions = parseActions(glossaryContent);
  const cover = parseCover(glossaryContent);
  const abilityScores = parseAbilityScoresFromGlossary(glossaryContent);
  const lightLevels = parseLightLevels(glossaryContent);
  const resting = parseResting(glossaryContent);
  const currency = parseCurrency(glossaryContent);

  const characterRules: CharacterRules = {
    classOverview,
    standardArrayByClass,
    hitPointsByClass,
    alignments,
    standardLanguages: languages.standard,
    rareLanguages: languages.rare,
    higherLevelStartingEquipment,
    trinkets,
    abilityScoreGeneration,
    abilityScoreModifiers,
    levelAdvancement,
    levelUpSteps,
    tiersOfPlay,
    multiclassing,
    conditions,
    actions,
    cover,
    abilityScores,
    lightLevels,
    resting,
    currency,
    source: {
      file: "DND5eSRD_019-035.md",
    },
  };

  // Ensure output directory exists
  await Deno.mkdir(outputDir, { recursive: true });

  // Write single consolidated rules file
  const outputPath = `${outputDir}/rules.json`;
  await Deno.writeTextFile(outputPath, JSON.stringify(characterRules, null, 2));

  // Log summary
  console.log(`    ✓ ${classOverview.length} class overviews`);
  console.log(`    ✓ ${standardArrayByClass.length} standard array entries`);
  console.log(`    ✓ ${hitPointsByClass.length} hit points by class entries`);
  console.log(`    ✓ ${alignments.length} alignments`);
  console.log(`    ✓ ${languages.standard.length} standard languages`);
  console.log(`    ✓ ${languages.rare.length} rare languages`);
  console.log(`    ✓ ${trinkets.length} trinkets`);
  console.log(`    ✓ ${conditions.length} conditions`);
  console.log(`    ✓ ${actions.length} actions`);
}

// For direct execution
if (import.meta.main) {
  const basePath = Deno.cwd();
  const inputDir = `${basePath}/srd_reference/normalized`;
  const glossaryPath = `${basePath}/srd_reference/srd_glossary.md`;
  const outputDir = `${basePath}/data/rules`;

  await parseCharacterRules(inputDir, glossaryPath, outputDir);
}
