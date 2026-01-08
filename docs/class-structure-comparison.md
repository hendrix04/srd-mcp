# Class Data Structure Comparison

## Current Structure (Problems for MCP Server)

### Query: "What does a level 5 Fighter get?"

**Current JSON:**
```json
{
  "levels": {
    "5": {
      "proficiencyBonus": 3,
      "classFeatures": ["Extra Attack", "Tactical Shift"],
      "classMetrics": { "secondWind": 3, "weaponMastery": 4 }
    }
  },
  "features": {
    "Extra Attack": {
      "level": 5,
      "name": "Extra Attack",
      "description": "You can attack twice..."
    },
    "Tactical Shift": {
      "level": 5,
      "name": "Tactical Shift",
      "description": "Whenever you activate..."
    }
  }
}
```

**Problems:**
1. Need to lookup each feature name in separate `features` object
2. Can't easily see what changed from level 4
3. Don't know cumulative features available
4. Metrics repeated even when unchanged

---

## Proposed Structure (MCP Server Optimized)

### Query: "What does a level 5 Fighter get?"

**New JSON:**
```json
{
  "progression": [
    {
      "level": 5,
      "proficiencyBonus": 3,
      
      "featuresGained": [
        {
          "name": "Extra Attack",
          "level": 5,
          "description": "You can attack twice instead of once whenever you take the Attack action on your turn."
        },
        {
          "name": "Tactical Shift",
          "level": 5,
          "description": "Whenever you activate your Second Wind with a Bonus Action, you can move up to half your Speed without provoking Opportunity Attacks."
        }
      ],
      
      "allFeatures": [
        "Fighting Style",
        "Second Wind",
        "Weapon Mastery",
        "Action Surge",
        "Tactical Mind",
        "Fighter Subclass",
        "Ability Score Improvement",
        "Extra Attack",
        "Tactical Shift"
      ],
      
      "metrics": {
        "secondWind": 3,
        "weaponMastery": 4
      },
      
      "metricsChanged": ["secondWind", "weaponMastery"]
    }
  ],
  
  "featureLevels": [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 15, 17, 19, 20]
}
```

**Benefits:**
1. ✅ **Single object access** - Everything for level 5 in one place
2. ✅ **No lookups needed** - Feature descriptions included inline
3. ✅ **Change tracking** - See what's new at this level via `metricsChanged`
4. ✅ **Cumulative view** - Know all features available via `allFeatures`
5. ✅ **Quick feature check** - `featureLevels` array shows which levels matter

---

## MCP Tool Query Examples

### Tool: `get_class_level`
```typescript
// Query: "What do I get at Fighter level 5?"
const level5 = classData.progression.find(p => p.level === 5);

// Response includes everything:
{
  newFeatures: level5.featuresGained,  // What you gain
  allFeatures: level5.allFeatures,     // Everything you have
  changes: level5.metricsChanged,      // What improved
  proficiencyBonus: level5.proficiencyBonus
}
```

### Tool: `get_feature_description`
```typescript
// Query: "Tell me about Extra Attack"
const feature = classData.progression
  .flatMap(p => p.featuresGained)
  .find(f => f.name === "Extra Attack");

// Direct access - no separate lookup needed
return feature.description;
```

### Tool: `compare_levels`
```typescript
// Query: "What changes from level 4 to 5?"
const level4 = classData.progression[3];
const level5 = classData.progression[4];

return {
  newFeatures: level5.featuresGained,
  metricChanges: level5.metricsChanged,
  proficiencyBonusChange: level5.proficiencyBonus !== level4.proficiencyBonus
};
```

---

## Additional Improvements

### 1. Clean Proficiencies
**Old:**
```json
{
  "skillChoices": {
    "options": ["Acrobatics", "Athletics", "or Survival"]
  }
}
```

**New:**
```json
{
  "skillChoices": {
    "count": 2,
    "from": ["Acrobatics", "Athletics", "Survival"]
  }
}
```

### 2. Normalized Feature Names
**Old:** `"Indomitable (one use)"`, `"Indomitable (two uses)"`  
**New:** `"Indomitable"` (details in description)

### 3. Subclass Tracking
```json
{
  "subclass": {
    "name": "Champion",
    "gainedAtLevel": 3,
    "description": "..."
  }
}
```

### 4. Feature Metadata
```json
{
  "name": "Sneak Attack",
  "level": 1,
  "description": "...",
  "isSubclassFeature": false
}
```

---

## Migration Path

1. Update TypeScript types (`class-types.ts`) ✅
2. Create new parser (`class-parser-v2.ts`)
3. Test on single class (Fighter)
4. Validate MCP query performance
5. Migrate all 12 classes
6. Update MCP tools to use new structure
