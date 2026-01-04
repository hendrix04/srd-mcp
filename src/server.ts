#!/usr/bin/env -S deno run --allow-read --allow-env

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DataLoader } from "./data/data-loader.ts";
import { ClassService } from "./services/class-service.ts";
import { RaceService } from "./services/race-service.ts";
import { RulesService } from "./services/rules-service.ts";
import { SpellService } from "./services/spell-service.ts";
import { registerAllTools } from "./tools/registry.ts";

/**
 * D&D 5e SRD MCP Server
 * Provides access to D&D 5e System Reference Document via MCP tools
 */
async function main() {
  console.error("Starting D&D 5e SRD MCP Server...");

  // Get base path from environment or use current working directory
  const basePath = Deno.env.get("SRD_DATA_PATH") || Deno.cwd();
  console.error(`Data path: ${basePath}`);

  // Initialize data loader
  const dataLoader = new DataLoader(basePath);

  // Initialize services
  const spellService = new SpellService(dataLoader);
  const classService = new ClassService(dataLoader);
  const raceService = new RaceService(dataLoader);
  const rulesService = new RulesService(dataLoader);

  // Create MCP server
  const server = new Server(
    {
      name: "dnd-5e-srd-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools
  registerAllTools(server, {
    spellService,
    classService,
    raceService,
    rulesService,
  });

  console.error("Tools registered successfully");

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("D&D 5e SRD MCP Server running on stdio");
}

// Run the server
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    Deno.exit(1);
  });
}
