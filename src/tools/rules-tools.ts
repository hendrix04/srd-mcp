import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { RulesService } from "../services/rules-service.ts";

/**
 * Register rules-related MCP tools
 */
export function registerRulesTools(server: Server, rulesService: RulesService) {
  // Register tools in the list
  const existingHandler = server.getRequestHandler(ListToolsRequestSchema);
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const baseTools = existingHandler ? await existingHandler(request) : { tools: [] };

    return {
      tools: [
        ...baseTools.tools,
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
  const existingCallHandler = server.getRequestHandler(CallToolRequestSchema);
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "get_combat_rule") {
      try {
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
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting combat rule: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Not a rules tool, pass to next handler
    if (existingCallHandler) {
      return existingCallHandler(request);
    }

    throw new Error(`Unknown tool: ${name}`);
  });
}
