import { dataLoader } from "./utils/data-loader.ts";
import { RulesService } from "./services/rules-service.ts";
import { CharacterService } from "./services/character-service.ts";
import { SpellService } from "./services/spell-service.ts";
import { ClassService } from "./services/class-service.ts";
import { SpeciesService } from "./services/species-service.ts";
import { BackgroundService } from "./services/background-service.ts";
import { FeatService } from "./services/feat-service.ts";
import {
  validateSpellFilters,
  validateClassLevel,
  validateFeatFilters,
  isValidString,
} from "./utils/validators.ts";
import * as fs from "node:fs";

/**
 * Node-based tool caller for Gemini CLI sub-agent.
 * Ported from legacy MCP registry.ts logic.
 */
async function main() {
  const toolName = process.argv[2];
  if (!toolName) {
    console.error("Error: tool name is required as first argument");
    process.exit(1);
  }

  // Read arguments from stdin
  let args: any = {};
  try {
    const input = fs.readFileSync(0, "utf8");
    if (input.trim()) {
      args = JSON.parse(input);
    }
  } catch (error) {
    console.error(`Error parsing stdin: ${(error as Error).message}`);
    process.exit(1);
  }

  // Initialize services
  const spellService = new SpellService(dataLoader);
  const classService = new ClassService(dataLoader);
  const speciesService = new SpeciesService(dataLoader);
  const rulesService = new RulesService(dataLoader);
  const backgroundService = new BackgroundService(dataLoader);
  const featService = new FeatService(dataLoader);
  const characterService = new CharacterService(dataLoader);

  try {
    let result: any = null;

    switch (toolName) {
      case "get_combat_rule": {
        const { topic } = args;
        if (!topic || !isValidString(topic)) {
          throw new Error("topic is required and must be a string");
        }
        const rule = await rulesService.getCombatRule(topic);
        result = rule 
          ? { llmContent: rule, returnDisplay: rule }
          : { llmContent: "Rule not found.", returnDisplay: "Rule not found." };
        break;
      }

      case "validate_character_choice": {
        const { choiceType, choiceName, characterState } = args;
        const validation = await characterService.validateChoice(choiceType, choiceName, characterState);
        const text = JSON.stringify(validation, null, 2);
        result = { llmContent: text, returnDisplay: `Validation result for **${choiceName}**: ${validation.valid ? "✅ VALID" : "❌ INVALID"}

${validation.reason}` };
        break;
      }

      case "list_spells": {
        const validation = validateSpellFilters(args);
        if (!validation.valid) throw new Error(validation.error);
        const spells = await spellService.listSpells(args);
        const text = JSON.stringify({ count: spells.length, spells }, null, 2);
        result = { llmContent: text, returnDisplay: `Found **${spells.length}** spells.` };
        break;
      }

      case "get_spell_details": {
        const { name } = args;
        if (!name || !isValidString(name)) throw new Error("name is required");
        const spell = await spellService.getSpellByName(name);
        if (!spell) throw new Error(`Spell not found: ${name}`);
        const text = JSON.stringify(spell, null, 2);
        result = { llmContent: text, returnDisplay: `Details for spell: **${spell.name}**` };
        break;
      }

      case "search_spells": {
        const { query, limit } = args;
        if (!query) throw new Error("query is required");
        const results = await spellService.searchSpells(query, limit);
        const text = JSON.stringify({ query, results }, null, 2);
        result = { llmContent: text, returnDisplay: `Found **${results.length}** fuzzy matches for "${query}".` };
        break;
      }

      case "list_classes": {
        const classes = await classService.listClasses();
        const text = JSON.stringify({ count: classes.length, classes }, null, 2);
        result = { llmContent: text, returnDisplay: `Found **${classes.length}** classes.` };
        break;
      }

      case "get_class_details": {
        const validation = validateClassLevel(args);
        if (!validation.valid) throw new Error(validation.error);
        const { className, level } = args;
        const classData = await classService.getClassDetails(className, level);
        if (!classData) throw new Error(`Class not found: ${className}`);
        const text = JSON.stringify(classData, null, 2);
        result = { llmContent: text, returnDisplay: `Details for class: **${classData.name}**${level ? ` (Level ${level})` : ""}` };
        break;
      }

      case "list_species": {
        const species = await speciesService.listSpecies();
        const text = JSON.stringify({ count: species.length, species }, null, 2);
        result = { llmContent: text, returnDisplay: `Found **${species.length}** species.` };
        break;
      }

      case "get_species_details": {
        const { speciesName } = args;
        if (!speciesName || !isValidString(speciesName)) throw new Error("speciesName is required");
        const species = await speciesService.getSpeciesDetails(speciesName);
        if (!species) throw new Error(`Species not found: ${speciesName}`);
        const text = JSON.stringify(species, null, 2);
        result = { llmContent: text, returnDisplay: `Details for species: **${species.name}**` };
        break;
      }

      case "list_backgrounds": {
        const backgrounds = await backgroundService.listBackgrounds();
        const text = JSON.stringify({ count: backgrounds.length, backgrounds }, null, 2);
        result = { llmContent: text, returnDisplay: `Found **${backgrounds.length}** backgrounds.` };
        break;
      }

      case "get_background_details": {
        const { backgroundName } = args;
        if (!backgroundName || !isValidString(backgroundName)) throw new Error("backgroundName is required");
        const background = await backgroundService.getBackgroundDetails(backgroundName);
        if (!background) throw new Error(`Background not found: ${backgroundName}`);
        const text = JSON.stringify(background, null, 2);
        result = { llmContent: text, returnDisplay: `Details for background: **${background.name}**` };
        break;
      }

      case "list_feats": {
        const validation = validateFeatFilters(args);
        if (!validation.valid) throw new Error(validation.error);
        const feats = await featService.listFeats(args);
        const text = JSON.stringify({ count: feats.length, feats }, null, 2);
        result = { llmContent: text, returnDisplay: `Found **${feats.length}** feats.` };
        break;
      }

      case "get_feat_details": {
        const { featName } = args;
        if (!featName || !isValidString(featName)) throw new Error("featName is required");
        const feat = await featService.getFeatDetails(featName);
        if (!feat) throw new Error(`Feat not found: ${featName}`);
        const text = JSON.stringify(feat, null, 2);
        result = { llmContent: text, returnDisplay: `Details for feat: **${feat.name}**` };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    console.log(JSON.stringify(result));
  } catch (error) {
    console.log(JSON.stringify({
      llmContent: `Error: ${(error as Error).message}`,
      returnDisplay: `❌ Error executing tool **${toolName}**: ${(error as Error).message}`,
      isError: true
    }));
    process.exit(0); // Exit gracefully so CLI can capture the JSON error
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
