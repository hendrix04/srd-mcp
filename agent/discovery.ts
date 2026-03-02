import { SRD_TOOLS } from "./tool-definitions.ts";

/**
 * Node-based tool discovery for Gemini CLI sub-agent.
 * Outputs tool schemas as JSON.
 */
function main() {
  console.log(JSON.stringify(SRD_TOOLS));
}

main();
