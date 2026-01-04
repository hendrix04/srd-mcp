import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ClassService } from "../services/class-service.ts";
import type { RaceService } from "../services/race-service.ts";
import type { RulesService } from "../services/rules-service.ts";
import type { SpellService } from "../services/spell-service.ts";

/**
 * Register all MCP tools with the server
 */
export function registerAllTools(
  server: Server,
  services: {
    spellService: SpellService;
    classService: ClassService;
    raceService: RaceService;
    rulesService: RulesService;
  }
) {
  const { spellService, classService, raceService, rulesService } = services;

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Spell tools
        {
          name: "list_spells",
          description: "List spells with optional filters for class, level, and school",
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
                description: "Filter by magic school (e.g., 'Evocation', 'Abjuration')",
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
          description: "Get complete details for a specific class, optionally filtered by character level",
          inputSchema: {
            type: "object",
            properties: {
              className: {
                type: "string",
                description: "Class name (e.g., 'Barbarian', 'Wizard')",
              },
              level: {
                type: "number",
                description: "Character level (1-20). If provided, only shows features/progression up to this level",
                minimum: 1,
                maximum: 20,
              },
            },
            required: ["className"],
          },
        },
        // Race tools
        {
          name: "list_races",
          description: "List all available D&D races/species",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_race_details",
          description: "Get complete details for a specific race/species",
          inputSchema: {
            type: "object",
            properties: {
              raceName: {
                type: "string",
                description: "Race name (e.g., 'Human', 'Elf', 'Dwarf')",
              },
            },
            required: ["raceName"],
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
                description: "Rule topic (e.g., 'grappled', 'attack', 'cover', 'dodge')",
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
          const filters = args as { className?: string; level?: number; school?: string };
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
          if (!spellName) {
            return {
              content: [{ type: "text" as const, text: "Error: spell name is required" }],
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
            content: [{ type: "text" as const, text: JSON.stringify(spell, null, 2) }],
          };
        }

        case "search_spells": {
          const { query, limit } = args as { query: string; limit?: number };
          if (!query) {
            return {
              content: [{ type: "text" as const, text: "Error: search query is required" }],
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
                text: JSON.stringify({ count: classes.length, classes }, null, 2),
              },
            ],
          };
        }

        case "get_class_details": {
          const { className, level } = args as { className: string; level?: number };
          if (!className) {
            return {
              content: [{ type: "text" as const, text: "Error: className is required" }],
              isError: true,
            };
          }
          const classData = await classService.getClassDetails(className, level);
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
            content: [{ type: "text" as const, text: JSON.stringify(classData, null, 2) }],
          };
        }

        // Race tools
        case "list_races": {
          const races = await raceService.listRaces();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ count: races.length, races }, null, 2),
              },
            ],
          };
        }

        case "get_race_details": {
          const { raceName } = args as { raceName: string };
          if (!raceName) {
            return {
              content: [{ type: "text" as const, text: "Error: raceName is required" }],
              isError: true,
            };
          }
          const race = await raceService.getRaceDetails(raceName);
          if (!race) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Race not found: ${raceName}`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [{ type: "text" as const, text: JSON.stringify(race, null, 2) }],
          };
        }

        // Rules tools
        case "get_combat_rule": {
          const { topic } = args as { topic: string };
          if (!topic) {
            return {
              content: [{ type: "text" as const, text: "Error: topic is required" }],
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
