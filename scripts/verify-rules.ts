const data = JSON.parse(await Deno.readTextFile("data/rules/character-rules.json"));

console.log("Character Rules Summary:");
console.log("=======================");
console.log(`Creation Steps: ${data.creationSteps.length}`);
console.log(`Ability Score Generation Methods: ${data.abilityScoreGeneration.length}`);
console.log(`Ability Score Modifiers (scores 3-20): ${Object.keys(data.abilityScoreModifiers).length}`);
console.log(`Level Advancement (levels 1-20): ${data.levelAdvancement.length}`);
console.log(`Tiers of Play: ${data.tiersOfPlay.length}`);
console.log(`Multiclassing Prerequisites: ${data.multiclassing.prerequisites.length}`);
console.log(`Multiclass Spell Slot Levels: ${data.multiclassing.spellSlots.length}`);

console.log("\nDetailed checks:");
console.log("===============");

// Check creation steps
const stepNumbers = data.creationSteps.map(s => s.stepNumber);
console.log(`✓ Creation steps: ${stepNumbers.join(", ")}`);

// Check ability score methods
const methodNames = data.abilityScoreGeneration.map(m => m.name);
console.log(`✓ Generation methods: ${methodNames.join(", ")}`);

// Check point costs
const pointCostMethod = data.abilityScoreGeneration.find(m => m.name === "Point Cost");
if (pointCostMethod?.details?.pointCosts) {
  const scores = Object.keys(pointCostMethod.details.pointCosts).sort((a, b) => parseInt(a) - parseInt(b));
  console.log(`✓ Point costs for scores: ${scores.join(", ")}`);
} else {
  console.log("✗ Point costs missing!");
}

// Check ability modifiers range
const modScores = Object.keys(data.abilityScoreModifiers).map(s => parseInt(s)).sort((a, b) => a - b);
console.log(`✓ Ability modifiers for scores: ${modScores[0]}-${modScores[modScores.length - 1]}`);

// Check level advancement
console.log(`✓ Level advancement: levels ${data.levelAdvancement[0].level}-${data.levelAdvancement[data.levelAdvancement.length - 1].level}`);

// Check tiers
const tiers = data.tiersOfPlay.map(t => `Tier ${t.tier} (${t.levels})`);
console.log(`✓ Tiers: ${tiers.join(", ")}`);

// Check multiclassing rules
console.log(`✓ Multiclassing rules sections: ${Object.keys(data.multiclassing.rules).length}`);

console.log("\n✓ All character rules parsed successfully!");
