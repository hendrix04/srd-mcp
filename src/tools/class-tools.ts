import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ClassService } from "../services/class-service.ts";

/**
 * Register class-related MCP tools
 */
export function registerClassTools(server: Server, classService: ClassService) {
  // Register tools in the list
  const existingHandler = server.getRequestHandler(ListToolsRequestSchema);
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const baseTools = existingHandler ? await existingHandler(request) : { tools: [] };

    return {
      tools: [
        ...baseTools.tools,
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
      ],
    };
  });

  // Handle tool calls
  const existingCallHandler = server.getRequestHandler(CallToolRequestSchema);
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "list_classes") {
      try {
        const classes = await classService.listClasses();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ count: classes.length, classes }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing classes: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === "get_class_details") {
      try {
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
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting class details: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Not a class tool, pass to next handler
    if (existingCallHandler) {
      return existingCallHandler(request);
    }

    throw new Error(`Unknown tool: ${name}`);
  });
}
