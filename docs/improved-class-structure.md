# Improved Class Data Structure for MCP Server

## Complete Structure Overview

```typescript
interface ClassData {
  // Identity
  name: string;
  description?: string;  // NEW: Class flavor text
  
  // Core Traits (from overview table)
  coreTraits: {
    primaryAbility: string;
    hitDie: string;
    savingThrows: string[];
    skillChoices: { count: number; from: string[] };
    armorProficiencies: string[];
    weaponProficiencies: string[];
    toolProficiencies?: string[];
  };
  
  // Starting equipment
  startingEquipment: EquipmentOption[];
  
  // NEW: Multiclass rules
  multiclass?: {
    prerequisites?: { abilityScores?: string };
    proficienciesGained: {
      armor?: string[];
      weapons?: string[];
      tools?: string[];
      skills?: { count: number; from: string[] };
    };
  };
  
  // Level progression (1-20)
  progression: LevelProgression[];
  
  // All features
  features: Feature[];
  featureLevels: number[];
  
  // NEW: Subclass data
  subclasses?: SubclassInfo[];
  
  // Source
  source: { file: string; line?: number };
}
```

## Example: Fighter Class

```json
{
  "name": "Fighter",
  "description": "A master of martial combat, skilled with a variety of weapons and armor.",
  
  "coreTraits": {
    "primaryAbility": "Strength or Dexterity",
    "hitDie": "D10",
    "savingThrows": ["Strength", "Constitution"],
    "skillChoices": {
      "count": 2,
      "from": [
        "Acrobatics",
        "Animal Handling",
        "Athletics",
        "History",
        "Insight",
        "Intimidation",
        "Persuasion",
        "Perception",
        "Survival"
      ]
    },
    "armorProficiencies": ["Light", "Medium", "Heavy", "Shields"],
    "weaponProficiencies": ["Simple weapons", "Martial weapons"],
    "toolProficiencies": []
  },
  
  "startingEquipment": [
    {
      "option": "A",
      "items": [
        "Chain Mail",
        "Greatsword",
        "Flail",
        "8 Javelins",
        "Dungeoneer's Pack",
        "4 GP"
      ]
    },
    {
      "option": "B",
      "items": [
        "Studded Leather Armor",
        "Scimitar",
        "Shortsword",
        "Longbow",
        "20 Arrows",
        "Quiver",
        "Dungeoneer's Pack",
        "11 GP"
      ]
    },
    {
      "option": "C",
      "gold": 155
    }
  ],
  
  "multiclass": {
    "prerequisites": {
      "abilityScores": "Strength 13 or Dexterity 13"
    },
    "proficienciesGained": {
      "armor": ["Light", "Medium", "Shields"],
      "weapons": ["Martial weapons"],
      "tools": [],
      "skills": null
    }
  },
  
  "progression": [
    {
      "level": 1,
      "proficiencyBonus": 2,
      "featuresGained": [
        {
          "name": "Fighting Style",
          "level": 1,
          "description": "You have honed your martial prowess and gain a Fighting Style feat of your choice...",
          "isSubclassFeature": false
        },
        {
          "name": "Second Wind",
          "level": 1,
          "description": "You have a limited well of physical and mental stamina that you can draw on...",
          "isSubclassFeature": false
        },
        {
          "name": "Weapon Mastery",
          "level": 1,
          "description": "Your training with weapons allows you to use the mastery properties...",
          "isSubclassFeature": false
        }
      ],
      "allFeatures": ["Fighting Style", "Second Wind", "Weapon Mastery"],
      "metrics": {
        "secondWind": 2,
        "weaponMastery": 3
      }
    },
    {
      "level": 2,
      "proficiencyBonus": 2,
      "featuresGained": [
        {
          "name": "Action Surge",
          "level": 2,
          "description": "You can push yourself beyond your normal limits for a moment...",
          "isSubclassFeature": false
        },
        {
          "name": "Tactical Mind",
          "level": 2,
          "description": "You have a mind for tactics on and off the battlefield...",
          "isSubclassFeature": false
        }
      ],
      "allFeatures": [
        "Fighting Style",
        "Second Wind",
        "Weapon Mastery",
        "Action Surge",
        "Tactical Mind"
      ],
      "metrics": {
        "secondWind": 2,
        "weaponMastery": 3
      }
    }
    // ... levels 3-20
  ],
  
  "features": [
    /* All features from progression.featuresGained flattened */
  ],
  
  "featureLevels": [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 15, 17, 19, 20],
  
  "subclasses": [
    {
      "name": "Champion",
      "gainedAtLevel": 3,
      "description": "A Champion focuses on the development of martial prowess in a relentless pursuit of victory...",
      "featureLevels": [3, 7, 10, 15, 18],
      "features": [
        {
          "name": "Improved Critical",
          "level": 3,
          "description": "Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20...",
          "isSubclassFeature": true
        },
        {
          "name": "Remarkable Athlete",
          "level": 3,
          "description": "Thanks to your athleticism, you have Advantage on Initiative rolls...",
          "isSubclassFeature": true
        }
        // ... more subclass features
      ]
    }
  ],
  
  "source": {
    "file": "DND5eSRD_047-063.md",
    "line": 0
  }
}
```

## MCP Tool Query Examples

### "What do I need to multiclass into Fighter?"

```typescript
const reqs = classData.multiclass?.prerequisites;
// Returns: { abilityScores: "Strength 13 or Dexterity 13" }
```

### "What proficiencies do I get if I multiclass into Fighter?"

```typescript
const profs = classData.multiclass?.proficienciesGained;
// Returns: {
//   armor: ["Light", "Medium", "Shields"],
//   weapons: ["Martial weapons"],
//   ...
// }
```

### "Tell me about the Fighter class"

```typescript
return {
  name: classData.name,
  description: classData.description,
  primaryAbility: classData.coreTraits.primaryAbility,
  hitDie: classData.coreTraits.hitDie
};
```

### "What subclasses are available for Fighter?"

```typescript
return classData.subclasses?.map(sub => ({
  name: sub.name,
  level: sub.gainedAtLevel,
  description: sub.description
}));
```

### "What does Champion subclass get at level 3?"

```typescript
const champion = classData.subclasses?.find(s => s.name === "Champion");
const level3Features = champion?.features.filter(f => f.level === 3);
```

## Data We're Now Capturing

✅ **Class overview table** (Core Traits)  
✅ **Starting equipment** (all options)  
✅ **Level progression table** (20 levels)  
✅ **All features** (with full descriptions)  
✅ **Proficiencies** (clean arrays, no artifacts)  
✅ **Multiclass rules** (NEW)  
✅ **Subclass information** (NEW)  
✅ **Class description** (NEW)  

## What's NOT in class data (belongs elsewhere)

❌ Standard Array (15, 14, 13, 12, 10, 8) - Character creation rules  
❌ Point buy system - Character creation rules  
❌ Species/race information - Separate race data  
❌ Background information - Separate background data  
❌ General equipment lists - Separate equipment data  
❌ Spell descriptions - Separate spell data (classes just reference them)
