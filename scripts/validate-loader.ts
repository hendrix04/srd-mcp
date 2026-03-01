import { dataLoader } from "../agent/utils/data-loader.ts";

async function main() {
  console.log("Starting DataLoader validation...");

  try {
    // 1. Spells
    const spells = await dataLoader.loadSpellsByName();
    console.log(`- Loaded ${Object.keys(spells).length} spells.`);

    // 2. Class
    const barbarian = await dataLoader.loadClass("Barbarian");
    if (barbarian) {
      console.log(`- Loaded Class: ${barbarian.name}`);
    } else {
      console.log("- Failed to load Barbarian class.");
    }

    // 3. Species
    const species = await dataLoader.loadAllSpecies();
    console.log(`- Loaded ${species.length} species.`);

    // 4. Backgrounds
    const backgrounds = await dataLoader.loadBackgrounds();
    console.log(`- Loaded ${backgrounds.length} backgrounds.`);

    // 5. Rules
    const rules = await dataLoader.loadCombatRules();
    console.log(`- Loaded Combat Rules: ${Object.keys(rules.actions).length} actions found.`);

    console.log("\nDataLoader validation PASSED!");
  } catch (error) {
    console.error("- Validation FAILED:", error);
    process.exit(1);
  }
}

main();
