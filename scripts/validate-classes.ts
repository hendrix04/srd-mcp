/**
 * Validation script to check accuracy of all parsed class data
 */

interface ClassData {
  name: string;
  primaryAbility: string;
  hitDie: string;
  savingThrows: string[];
  levels: Record<string, any>;
  features: Record<string, any>;
}

const EXPECTED_CLASSES = [
  { name: "Barbarian", primaryAbility: "Strength", hitDie: "D12" },
  { name: "Bard", primaryAbility: "Charisma", hitDie: "D8" },
  { name: "Cleric", primaryAbility: "Wisdom", hitDie: "D8" },
  { name: "Druid", primaryAbility: "Wisdom", hitDie: "D8" },
  { name: "Fighter", primaryAbility: "Strength or Dexterity", hitDie: "D10" },
  { name: "Monk", primaryAbility: "Dexterity and Wisdom", hitDie: "D8" },
  { name: "Paladin", primaryAbility: "Strength and Charisma", hitDie: "D10" },
  { name: "Ranger", primaryAbility: "Dexterity and Wisdom", hitDie: "D10" },
  { name: "Rogue", primaryAbility: "Dexterity", hitDie: "D8" },
  { name: "Sorcerer", primaryAbility: "Charisma", hitDie: "D6" },
  { name: "Warlock", primaryAbility: "Charisma", hitDie: "D8" },
  { name: "Wizard", primaryAbility: "Intelligence", hitDie: "D6" },
];

async function validateClasses() {
  const basePath = Deno.cwd();
  const classesDir = `${basePath}/data/classes`;

  console.log("\nFINAL CLASS PARSING VALIDATION");
  console.log("=".repeat(80));

  let allValid = true;

  for (const expected of EXPECTED_CLASSES) {
    const fileName = expected.name.toLowerCase() + ".json";
    const filePath = `${classesDir}/${fileName}`;

    try {
      const content = await Deno.readTextFile(filePath);
      const classData: ClassData = JSON.parse(content);

      // Validate basic fields
      const nameMatch = classData.name === expected.name;
      const paMatch = classData.primaryAbility === expected.primaryAbility;
      const hdMatch = classData.hitDie === expected.hitDie;

      // Validate levels (should have 20)
      const levelCount = Object.keys(classData.levels).length;
      const hasAllLevels = levelCount === 20;

      // Count total features
      const featureCount = Object.keys(classData.features).length;

      // Check if all levels have expected structure
      let levelsValid = true;
      for (let i = 1; i <= 20; i++) {
        const level = classData.levels[i];
        if (!level) {
          levelsValid = false;
          break;
        }
        if (typeof level.proficiencyBonus !== "number") {
          levelsValid = false;
          break;
        }
        if (!Array.isArray(level.classFeatures)) {
          levelsValid = false;
          break;
        }
      }

      const isValid = nameMatch && paMatch && hdMatch && hasAllLevels && levelsValid;
      allValid = allValid && isValid;

      const status = isValid ? "✓" : "✗";
      const paDisplay = classData.primaryAbility.padEnd(29);
      const hdDisplay = classData.hitDie.padEnd(5);
      const lvlDisplay = `${levelCount}`.padStart(2);
      const featDisplay = `${featureCount}`.padStart(2);

      console.log(
        `${status} ${expected.name.toUpperCase().padEnd(10)} | PA: ${paDisplay} | Die: ${hdDisplay} | Lvls: ${lvlDisplay} | Features: ${featDisplay}`
      );

      // Report specific issues
      if (!nameMatch) console.log(`  ⚠ Name mismatch: expected "${expected.name}", got "${classData.name}"`);
      if (!paMatch)
        console.log(
          `  ⚠ Primary ability mismatch: expected "${expected.primaryAbility}", got "${classData.primaryAbility}"`
        );
      if (!hdMatch) console.log(`  ⚠ Hit die mismatch: expected "${expected.hitDie}", got "${classData.hitDie}"`);
      if (!hasAllLevels) console.log(`  ⚠ Level count mismatch: expected 20, got ${levelCount}`);
      if (!levelsValid) console.log(`  ⚠ Some levels have invalid structure`);
    } catch (error) {
      console.log(`✗ ${expected.name.toUpperCase().padEnd(10)} | ERROR: ${error.message}`);
      allValid = false;
    }
  }

  console.log("=".repeat(80));
  if (allValid) {
    console.log("SUCCESS: All 12 classes parsed accurately!");
  } else {
    console.log("FAILURE: Some classes have issues that need fixing.");
  }
  console.log();

  Deno.exit(allValid ? 0 : 1);
}

validateClasses();
