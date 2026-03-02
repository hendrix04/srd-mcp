/**
 * Tool definitions (schemas) for the SRD sub-agent.
 * Ported from legacy MCP registry.ts.
 */
export const SRD_TOOLS = [
  {
    name: "get_combat_rule",
    description: "Look up a specific combat rule, action, or condition from the SRD.",
    parameters: {
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
  {
    name: "validate_character_choice",
    description: "Validate a character build choice (e.g., taking a feat) against SRD prerequisites.",
    parameters: {
      type: "object",
      properties: {
        choiceType: {
          type: "string",
          enum: ["feat"],
          description: "Type of choice to validate",
        },
        choiceName: {
          type: "string",
          description: "Name of the feat or choice",
        },
        characterState: {
          type: "object",
          properties: {
            level: { type: "number", minimum: 1, maximum: 20 },
            classes: { type: "array", items: { type: "string" } },
            features: { type: "array", items: { type: "string" } },
            abilityScores: {
              type: "object",
              properties: {
                strength: { type: "number" },
                dexterity: { type: "number" },
                constitution: { type: "number" },
                intelligence: { type: "number" },
                wisdom: { type: "number" },
                charisma: { type: "number" },
              },
            },
          },
          required: ["level", "classes", "features", "abilityScores"],
        },
      },
      required: ["choiceType", "choiceName", "characterState"],
    },
  },
  {
    name: "list_spells",
    description: "List spells with optional filters for class, level, and school.",
    parameters: {
      type: "object",
      properties: {
        className: {
          type: "string",
          description: "Filter by class name (e.g., 'Wizard', 'Cleric')",
        },
        level: {
          type: "number",
          description: "Filter by spell level (0-9)",
          minimum: 0,
          maximum: 9,
        },
        school: {
          type: "string",
          description: "Filter by magic school (e.g., 'Evocation', 'Abjuration')",
        },
      },
    },
  },
  {
    name: "get_spell_details",
    description: "Get complete details for a specific spell by name.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Spell name (e.g., 'Fireball', 'Cure Wounds')",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "search_spells",
    description: "Search for spells using fuzzy name matching.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (spell name or partial name)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 10)",
          minimum: 1,
          maximum: 50,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_classes",
    description: "List all available D&D classes.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_class_details",
    description: "Get complete details for a specific class, optionally filtered by character level.",
    parameters: {
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
  {
    name: "list_species",
    description: "List all available D&D species.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_species_details",
    description: "Get complete details for a specific species.",
    parameters: {
      type: "object",
      properties: {
        speciesName: {
          type: "string",
          description: "Species name (e.g., 'Human', 'Elf', 'Dwarf')",
        },
      },
      required: ["speciesName"],
    },
  },
  {
    name: "list_backgrounds",
    description: "List all available D&D backgrounds.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_background_details",
    description: "Get detailed information about a specific background.",
    parameters: {
      type: "object",
      properties: {
        backgroundName: {
          type: "string",
          description: "Background name (e.g., 'Acolyte', 'Criminal', 'Sage')",
        },
      },
      required: ["backgroundName"],
    },
  },
  {
    name: "list_feats",
    description: "List all available D&D feats, optionally filtered by category.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Feat category (e.g., 'Origin', 'General', 'Fighting Style')",
        },
        repeatable: {
          type: "boolean",
          description: "Filter by whether the feat is repeatable",
        },
      },
    },
  },
  {
    name: "get_feat_details",
    description: "Get detailed information about a specific feat.",
    parameters: {
      type: "object",
      properties: {
        featName: {
          type: "string",
          description: "Feat name (e.g., 'Alert', 'Lucky', 'Savage Attacker')",
        },
      },
      required: ["featName"],
    },
  },
];
