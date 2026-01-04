import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { RaceService } from "../services/race-service.ts";

/**
 * Register race-related MCP tools
 */
export function registerRaceTools(server: Server, raceService: RaceService) {
  // Register tools in the list
  const existingHandler = server.getRequestHandler(ListToolsRequestSchema);
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const baseTools = existingHandler ? await existingHandler(request) : { tools: [] };

    return {
      tools: [
        ...baseTools.tools,
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
      ],
    };
  });

  // Handle tool calls
  const existingCallHandler = server.getRequestHandler(CallToolRequestSchema);
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "list_races") {
      try {
        const races = await raceService.listRaces();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ count: races.length, races }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing races: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === "get_race_details") {
      try {
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
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting race details: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Not a race tool, pass to next handler
    if (existingCallHandler) {
      return existingCallHandler(request);
    }

    throw new Error(`Unknown tool: ${name}`);
  });
}
