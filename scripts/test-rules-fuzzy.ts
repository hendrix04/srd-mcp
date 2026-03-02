import { dataLoader } from "../agent/utils/data-loader.ts";
import { RulesService } from "../src/services/rules-service.ts";

async function main() {
  const rulesService = new RulesService(dataLoader);
  
  const topics = ["Prone", "Dash", "Fighter", "Dexter", "Short Rest"];
  
  console.log("Testing RulesService Fuzzy Search...");
  console.log("------------------------------------");

  for (const topic of topics) {
    const result = await rulesService.getCombatRule(topic);
    console.log(`Query: "${topic}"`);
    console.log(`Result: ${result || "NOT FOUND"}`);
    console.log("------------------------------------");
  }
}

main().catch(console.error);
