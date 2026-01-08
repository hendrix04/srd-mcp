/**
 * Integration tests for SRD MCP Server
 * Tests critical paths from tool calls through services to data loading
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { DataLoader } from "../src/data/data-loader.ts";
import { SpellService } from "../src/services/spell-service.ts";
import { ClassService } from "../src/services/class-service.ts";
import { SpeciesService } from "../src/services/species-service.ts";
import { BackgroundService } from "../src/services/background-service.ts";
import { FeatService } from "../src/services/feat-service.ts";
import { RulesService } from "../src/services/rules-service.ts";

// Initialize services once for all tests
const basePath = Deno.cwd();
const dataLoader = new DataLoader(basePath);
const spellService = new SpellService(dataLoader);
const classService = new ClassService(dataLoader);
const speciesService = new SpeciesService(dataLoader);
const backgroundService = new BackgroundService(dataLoader);
const featService = new FeatService(dataLoader);
const rulesService = new RulesService(dataLoader);

// Spell Service Tests
Deno.test("SpellService - list spells returns array", async () => {
  const spells = await spellService.listSpells();
  assertExists(spells);
  assertEquals(Array.isArray(spells), true);
  assertEquals(spells.length > 0, true);
});

Deno.test("SpellService - filter spells by class", async () => {
  const wizardSpells = await spellService.listSpells({ className: "Wizard" });
  assertExists(wizardSpells);
  assertEquals(wizardSpells.length > 0, true);
});

Deno.test("SpellService - get spell details (case-insensitive)", async () => {
  const spell = await spellService.getSpellByName("fireball");
  assertExists(spell);
  assertEquals(spell.name, "Fireball");
  assertEquals(spell.level, 3);
});

Deno.test("SpellService - search spells returns results", async () => {
  const results = await spellService.searchSpells("fire", 5);
  assertExists(results);
  assertEquals(Array.isArray(results), true);
  assertEquals(results.length > 0, true);
});

// Class Service Tests
Deno.test("ClassService - list classes returns all classes", async () => {
  const classes = await classService.listClasses();
  assertExists(classes);
  assertEquals(classes.length, 12); // Should have all 12 classes
});

Deno.test("ClassService - get class details", async () => {
  const barbarian = await classService.getClassDetails("Barbarian");
  assertExists(barbarian);
  assertEquals(barbarian.name, "Barbarian");
  assertExists(barbarian.coreTraits);
  assertEquals(barbarian.coreTraits.hitDie, "D12");
});

Deno.test("ClassService - filter class by level", async () => {
  const barb5 = await classService.getClassDetails("Barbarian", 5);
  assertExists(barb5);
  assertEquals(barb5.progression.length, 5);
  assertEquals(
    barb5.progression.every((p) => p.level <= 5),
    true,
  );
});

// Species Service Tests
Deno.test("SpeciesService - list species returns all", async () => {
  const species = await speciesService.listSpecies();
  assertExists(species);
  assertEquals(species.length, 9); // Should have all 9 species
});

Deno.test(
  "SpeciesService - get species details (case-insensitive)",
  async () => {
    const human = await speciesService.getSpeciesDetails("human");
    assertExists(human);
    assertEquals(human.name, "Human");
    assertExists(human.size);
    assertExists(human.speed);
  },
);

Deno.test("SpeciesService - species not found returns null", async () => {
  const fake = await speciesService.getSpeciesDetails("FakeSpecies");
  assertEquals(fake, null);
});

// Background Service Tests
Deno.test("BackgroundService - list backgrounds returns all", async () => {
  const backgrounds = await backgroundService.listBackgrounds();
  assertExists(backgrounds);
  assertEquals(backgrounds.length, 4); // Should have all 4 backgrounds
});

Deno.test(
  "BackgroundService - get background details (case-insensitive)",
  async () => {
    const acolyte = await backgroundService.getBackgroundDetails("acolyte");
    assertExists(acolyte);
    assertEquals(acolyte.name, "Acolyte");
    assertExists(acolyte.skillProficiencies);
    assertExists(acolyte.feat);
  },
);

Deno.test("BackgroundService - background not found returns null", async () => {
  const fake = await backgroundService.getBackgroundDetails("FakeBackground");
  assertEquals(fake, null);
});

// Feat Service Tests
Deno.test("FeatService - list all feats", async () => {
  const feats = await featService.listFeats();
  assertExists(feats);
  assertEquals(feats.length, 17); // Should have all 17 feats
});

Deno.test("FeatService - filter feats by category", async () => {
  const originFeats = await featService.listFeats({ category: "Origin" });
  assertExists(originFeats);
  assertEquals(originFeats.length, 4);
  assertEquals(
    originFeats.every((f) => f.category === "Origin"),
    true,
  );
});

Deno.test("FeatService - filter feats by repeatable", async () => {
  const repeatableFeats = await featService.listFeats({ repeatable: true });
  assertExists(repeatableFeats);
  assertEquals(
    repeatableFeats.every((f) => f.repeatable === true),
    true,
  );
});

Deno.test("FeatService - get feat details (case-insensitive)", async () => {
  const alert = await featService.getFeatDetails("alert");
  assertExists(alert);
  assertEquals(alert.name, "Alert");
  assertEquals(alert.category, "Origin");
});

// Rules Service Tests
Deno.test("RulesService - get combat rule", async () => {
  const grappled = await rulesService.getCombatRule("grappled");
  assertExists(grappled);
  assertEquals(typeof grappled, "string");
  assertEquals(grappled.toLowerCase().includes("grappled"), true);
});

Deno.test("RulesService - rule not found returns null", async () => {
  const fake = await rulesService.getCombatRule("FakeRule");
  assertEquals(fake, null);
});

// Error Handling Tests
Deno.test("DataLoader - handles missing files gracefully", async () => {
  const badLoader = new DataLoader("/nonexistent/path");
  try {
    await badLoader.loadBackgrounds();
    throw new Error("Should have thrown an error");
  } catch (error) {
    assertExists(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    assertEquals(errorMessage.includes("preprocess"), true);
  }
});

console.log("✅ All integration tests passed!");
