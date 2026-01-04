import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { SpellService } from "../services/spell-service.ts";

/**
 * Register spell-related MCP tools
 */
export function registerSpellTools(server: Server, spellService: SpellService) {
  // Register tools in the list
  const existingHandler = server.getRequestHandler(ListToolsRequestSchema);
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const baseTools = existingHandler ? await existingHandler(request) : { tools: [] };

    return {
      tools: [
        ...baseTools.tools,
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
      ],
    };
  });

  // Handle tool calls
  const existingCallHandler = server.getRequestHandler(CallToolRequestSchema);
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "list_spells") {
      try {
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
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing spells: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === "get_spell_details") {
      try {
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
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting spell details: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === "search_spells") {
      try {
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
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching spells: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Not a spell tool, pass to next handler
    if (existingCallHandler) {
      return existingCallHandler(request);
    }

    throw new Error(`Unknown tool: ${name}`);
  });
}
