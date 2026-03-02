# D&D 5e SRD Gemini Sub-Agent

A native Gemini CLI sub-agent that provides authoritative access to the Dungeons & Dragons 5th Edition System Reference Document (SRD 5.2.1). This sub-agent is optimized for rules reference, spell lookup, and character build validation.

## Features

- **SRD Consultant**: A specialized persona for rules and mechanics.
- **Rules Consultant Skill**: Enforces accurate, data-grounded reasoning with verbatim SRD quotes.
- **Character Validator Skill**: Validates feats and character choices against SRD prerequisites.
- **Comprehensive Tools**: Search and retrieve details for spells, classes, species, and more.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v22.6.0 or higher (for agent execution)
- [Deno](https://deno.land/) v1.37 or higher (for data preprocessing)
- [Gemini CLI](https://github.com/google/gemini-cli) installed and configured

### Setup

1. Clone this repository.
2. Generate the preprocessed JSON data:

```bash
deno task preprocess
```

3. Ensure the project is trusted by Gemini CLI to allow local tool execution.

## Usage

You can invoke the sub-agent directly from your Gemini CLI session:

```bash
/agents call srd-consultant "What are the rules for Grappling?"
```

Or ask the primary agent to delegate a task:

> "Check if my Level 2 Wizard can take the Grappler feat."

The primary agent will automatically identify the `srd-consultant` as the expert and delegate the query.

## Available Tools

The sub-agent possesses the following native tools:

- **`get_combat_rule`**: Look up game rules (actions, conditions, etc.)
- **`validate_character_choice`**: Validate feats and build choices.
- **`list_spells` / `get_spell_details` / `search_spells`**: Complete spell reference.
- **`list_classes` / `get_class_details`**: Character class information.
- **`list_species` / `get_species_details`**: Species and ancestry traits.
- **`list_backgrounds` / `get_background_details`**: Background information.
- **`list_feats` / `get_feat_details`**: Character feat reference.

## Architecture

This project uses a native sub-agent architecture:

- **Preprocessing**: Deno-based markdown → JSON transformation.
- **Core Logic**: Node.js services and tools in the `agent/` directory.
- **Integration**: Command-based tool discovery via `.gemini/settings.json`.
- **Skills**: Specialized reasoning engines defined in the `pickle-rick` extension.

## Performance

- **Data load**: <100ms (cached singleton DataLoader).
- **Query response**: Near-instantaneous native execution.
- **Memory footprint**: Lightweight and stateless.

## Legal & Attribution

All SRD content is licensed under Creative Commons Attribution 4.0 International (CC-BY-4.0) by Wizards of the Coast LLC.

**Attribution:**
> This work includes material taken from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC and is available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

## License

MIT License - See LICENSE file for details.
