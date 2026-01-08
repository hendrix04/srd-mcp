/**
 * Validate the new class structure for MCP server usage
 */

import type { ClassData } from "../src/types/class-types.ts";

const classData: ClassData = JSON.parse(
  await Deno.readTextFile("data/classes/fighter.json")
);

console.log("=== MCP Query Validation ===\n");

// Query 1: "Tell me about the Fighter class"
console.log("Query: Tell me about the Fighter class");
console.log(`✓ Name: ${classData.name}`);
console.log(`✓ Primary Ability: ${classData.coreTraits.primaryAbility}`);
console.log(`✓ Hit Die: ${classData.coreTraits.hitDie}`);
console.log(`✓ Saving Throws: ${classData.coreTraits.savingThrows.join(", ")}`);

// Query 2: "What do I get at level 5?"
console.log("\nQuery: What do I get at Fighter level 5?");
const level5 = classData.progression.find(p => p.level === 5);
if (level5) {
  console.log(`✓ Proficiency Bonus: +${level5.proficiencyBonus}`);
  console.log(`✓ New Features:`);
  for (const feature of level5.featuresGained) {
    console.log(`  - ${feature.name}: ${feature.description.substring(0, 60)}...`);
  }
  console.log(`✓ Metrics Changed: ${level5.metricsChanged?.join(", ") || "none"}`);
  console.log(`✓ Total Features Available: ${level5.allFeatures.length}`);
}

// Query 3: "Tell me about Action Surge"
console.log("\nQuery: Tell me about the Action Surge feature");
const actionSurge = classData.features.find(f => f.name === "Action Surge");
if (actionSurge) {
  console.log(`✓ Level Gained: ${actionSurge.level}`);
  console.log(`✓ Description: ${actionSurge.description.substring(0, 100)}...`);
}

// Query 4: "What are my skill options?"
console.log("\nQuery: What skills can a Fighter choose?");
console.log(`✓ Choose ${classData.coreTraits.skillChoices.count} from:`);
console.log(`  ${classData.coreTraits.skillChoices.from.join(", ")}`);

// Query 5: "What proficiencies do I get?"
console.log("\nQuery: What proficiencies does a Fighter get?");
console.log(`✓ Armor: ${classData.coreTraits.armorProficiencies.join(", ")}`);
console.log(`✓ Weapons: ${classData.coreTraits.weaponProficiencies.join(", ")}`);

// Query 6: "What changed from level 4 to 5?"
console.log("\nQuery: What changed from level 4 to 5?");
const level4 = classData.progression.find(p => p.level === 4);
if (level4 && level5) {
  console.log(`✓ New features at 5:`);
  for (const f of level5.featuresGained) {
    console.log(`  - ${f.name}`);
  }
  console.log(`✓ Proficiency bonus: ${level4.proficiencyBonus} → ${level5.proficiencyBonus}`);
  console.log(`✓ Metrics changed: ${level5.metricsChanged?.join(", ") || "none"}`);
}

// Query 7: "What subclasses are available?"
console.log("\nQuery: What subclasses are available for Fighter?");
if (classData.subclasses) {
  for (const sub of classData.subclasses) {
    console.log(`✓ ${sub.name} (gained at level ${sub.gainedAtLevel})`);
    console.log(`  Features at levels: ${sub.featureLevels?.join(", ")}`);
  }
}

// Query 8: "Can I multiclass into Fighter?"
console.log("\nQuery: Can I multiclass into Fighter? What do I need?");
if (classData.multiclass) {
  if (classData.multiclass.prerequisites?.abilityScores) {
    console.log(`✓ Prerequisites: ${classData.multiclass.prerequisites.abilityScores}`);
  }
  console.log(`✓ Proficiencies gained when multiclassing:`);
  if (classData.multiclass.proficienciesGained.armor) {
    console.log(`  Armor: ${classData.multiclass.proficienciesGained.armor.join(", ")}`);
  }
  if (classData.multiclass.proficienciesGained.weapons) {
    console.log(`  Weapons: ${classData.multiclass.proficienciesGained.weapons.join(", ")}`);
  }
} else {
  console.log("⚠ No multiclass info available");
}

console.log("\n=== Structure Validation Complete ===");
console.log(`✓ All progression levels: ${classData.progression.length === 20 ? "20/20" : "FAILED"}`);
console.log(`✓ Total features: ${classData.features.length}`);
console.log(`✓ Feature levels: ${classData.featureLevels.join(", ")}`);
