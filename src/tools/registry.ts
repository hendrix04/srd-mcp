import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ClassService } from "../services/class-service.ts";
import type { SpeciesService } from "../services/species-service.ts";
import type { RulesService } from "../services/rules-service.ts";
import type { SpellService } from "../services/spell-service.ts";
import type { BackgroundService } from "../services/background-service.ts";
import type { FeatService } from "../services/feat-service.ts";
import {
  validateSpellFilters,
  validateClassLevel,
  validateFeatFilters,
  isValidString,
} from "../utils/validators.ts";

/**
 * Register all MCP tools with the server
 */
export function registerAllTools(
  server: Server,
  services: {
    spellService: SpellService;
    classService: ClassService;
    speciesService: SpeciesService;
    rulesService: RulesService;
    backgroundService: BackgroundService;
    featService: FeatService;
  },
) {
  const {
    spellService,
    classService,
    speciesService,
    rulesService,
    backgroundService,
    featService,
  } = services;

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Spell tools
        {
          name: "list_spells",
          description:
            "List spells with optional filters for class, level, and school",
          inputSchema: {
            type: "object",
            properties: {
              className: {
                type: "string",
                description: "Filter by class name (e.g., 'Wizard', 'Cleric')",
              },
              level: {
                type: "number",
                description: "Filter by spell level (0-9)",
                minimum: 0,
                maximum: 9,
              },
              school: {
                type: "string",
                description:
                  "Filter by magic school (e.g., 'Evocation', 'Abjuration')",
              },
            },
          },
        },
        {
          name: "get_spell_details",
          description: "Get complete details for a specific spell by name",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Spell name (e.g., 'Fireball', 'Cure Wounds')",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "search_spells",
          description: "Search for spells using fuzzy name matching",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query (spell name or partial name)",
              },
              limit: {
                type: "number",
                description: "Maximum number of results (default: 10)",
                minimum: 1,
                maximum: 50,
              },
            },
            required: ["query"],
          },
        },
        // Class tools
        {
          name: "list_classes",
          description: "List all available D&D classes",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_class_details",
          description:
            "Get complete details for a specific class, optionally filtered by character level",
          inputSchema: {
            type: "object",
            properties: {
              className: {
                type: "string",
                description: "Class name (e.g., 'Barbarian', 'Wizard')",
              },
              level: {
                type: "number",
                description:
                  "Character level (1-20). If provided, only shows features/progression up to this level",
                minimum: 1,
                maximum: 20,
              },
            },
            required: ["className"],
          },
        },
        // Species tools
        {
          name: "list_species",
          description: "List all available D&D species",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_species_details",
          description: "Get complete details for a specific species",
          inputSchema: {
            type: "object",
            properties: {
              speciesName: {
                type: "string",
                description: "Species name (e.g., 'Human', 'Elf', 'Dwarf')",
              },
            },
            required: ["speciesName"],
          },
        },
        // Background tools
        {
          name: "list_backgrounds",
          description: "List all available D&D backgrounds",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_background_details",
          description: "Get detailed information about a specific background",
          inputSchema: {
            type: "object",
            properties: {
              backgroundName: {
                type: "string",
                description:
                  "Background name (e.g., 'Acolyte', 'Criminal', 'Sage')",
              },
            },
            required: ["backgroundName"],
          },
        },
        // Feat tools
        {
          name: "list_feats",
          description:
            "List all available D&D feats, optionally filtered by category",
          inputSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description:
                  "Feat category (e.g., 'Origin', 'General', 'Fighting Style')",
              },
              repeatable: {
                type: "boolean",
                description: "Filter by whether the feat is repeatable",
              },
            },
          },
        },
        {
          name: "get_feat_details",
          description: "Get detailed information about a specific feat",
          inputSchema: {
            type: "object",
            properties: {
              featName: {
                type: "string",
                description:
                  "Feat name (e.g., 'Alert', 'Lucky', 'Savage Attacker')",
              },
            },
            required: ["featName"],
          },
        },
        // Rules tools
        {
          name: "get_combat_rule",
          description: "Look up a specific combat rule, action, or condition",
          inputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description:
                  "Rule topic (e.g., 'grappled', 'attack', 'cover', 'dodge')",
              },
            },
            required: ["topic"],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // Spell tools
        case "list_spells": {
          const validation = validateSpellFilters(args);
          if (!validation.valid) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: ${validation.error}`,
                },
              ],
              isError: true,
            };
          }
          const filters = args as {
            className?: string;
            level?: number;
            school?: string;
          };
          const spells = await spellService.listSpells(filters);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ count: spells.length, spells }, null, 2),
              },
            ],
          };
        }

        case "get_spell_details": {
          const { name: spellName } = args as { name: string };
          if (!spellName || !isValidString(spellName)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: spell name is required and must be a non-empty string",
                },
              ],
              isError: true,
            };
          }
          const spell = await spellService.getSpellByName(spellName);
          if (!spell) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Spell not found: ${spellName}. Try using search_spells to find similar spells.`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(spell, null, 2) },
            ],
          };
        }

        case "search_spells": {
          const { query, limit } = args as { query: string; limit?: number };
          if (!query) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: search query is required",
                },
              ],
              isError: true,
            };
          }
          const results = await spellService.searchSpells(query, limit);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ query, results }, null, 2),
              },
            ],
          };
        }

        // Class tools
        case "list_classes": {
          const classes = await classService.listClasses();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { count: classes.length, classes },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "get_class_details": {
          const validation = validateClassLevel(args);
          if (!validation.valid) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: ${validation.error}`,
                },
              ],
              isError: true,
            };
          }
          const { className, level } = args as {
            className: string;
            level?: number;
          };
          const classData = await classService.getClassDetails(
            className,
            level,
          );
          if (!classData) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Class not found: ${className}`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(classData, null, 2),
              },
            ],
          };
        }

        // Species tools
        case "list_species": {
          const species = await speciesService.listSpecies();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { count: species.length, species },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "get_species_details": {
          const { speciesName } = args as { speciesName: string };
          if (!speciesName || !isValidString(speciesName)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: speciesName is required and must be a non-empty string",
                },
              ],
              isError: true,
            };
          }
          const species = await speciesService.getSpeciesDetails(speciesName);
          if (!species) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Species not found: ${speciesName}`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(species, null, 2) },
            ],
          };
        }

        // Background tools
        case "list_backgrounds": {
          const backgrounds = await backgroundService.listBackgrounds();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { count: backgrounds.length, backgrounds },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "get_background_details": {
          const { backgroundName } = args as { backgroundName: string };
          if (!backgroundName || !isValidString(backgroundName)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: backgroundName is required and must be a non-empty string",
                },
              ],
              isError: true,
            };
          }
          const background =
            await backgroundService.getBackgroundDetails(backgroundName);
          if (!background) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Background not found: ${backgroundName}`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(background, null, 2),
              },
            ],
          };
        }

        // Feat tools
        case "list_feats": {
          const validation = validateFeatFilters(args);
          if (!validation.valid) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: ${validation.error}`,
                },
              ],
              isError: true,
            };
          }
          const { category, repeatable } = args as {
            category?: string;
            repeatable?: boolean;
          };
          const feats = await featService.listFeats({ category, repeatable });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ count: feats.length, feats }, null, 2),
              },
            ],
          };
        }

        case "get_feat_details": {
          const { featName } = args as { featName: string };
          if (!featName || !isValidString(featName)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: featName is required and must be a non-empty string",
                },
              ],
              isError: true,
            };
          }
          const feat = await featService.getFeatDetails(featName);
          if (!feat) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Feat not found: ${featName}`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(feat, null, 2) },
            ],
          };
        }

        // Rules tools
        case "get_combat_rule": {
          const { topic } = args as { topic: string };
          if (!topic || !isValidString(topic)) {
            return {
              content: [
                { type: "text" as const, text: "Error: topic is required" },
              ],
              isError: true,
            };
          }
          const rule = await rulesService.getCombatRule(topic);
          if (!rule) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `No rule found for topic: ${topic}. Try searching for actions (attack, dash, dodge), conditions (blinded, grappled, stunned), or other combat terms.`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [{ type: "text" as const, text: rule }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error executing tool ${name}: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  });
}
