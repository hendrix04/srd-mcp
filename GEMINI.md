# D&D 5e SRD Sub-Agent - Context & Guidelines

This project provides a native Gemini CLI sub-agent that offers authoritative access to the Dungeons & Dragons 5th Edition System Reference Document (SRD 5.2.1).

## Project Overview

The sub-agent exposes D&D rules, spells, classes, species, backgrounds, and feats through specialized tools and skills. It follows a **native sub-agent architecture** consisting of:
1.  **Preprocessing:** A Deno-based pipeline that transforms raw SRD Markdown files into structured JSON.
2.  **Data Loader:** A Node.js compatible loader that reads JSON data with in-memory caching.
3.  **Services Layer:** Node-compatible business logic for searching, filtering, and retrieving game data.
4.  **Sub-Agent Tools:** A Node.js tool caller that executes service logic for the Gemini CLI.
5.  **Specialized Skills:** Instructions and reasoning engines for complex D&D queries (Rules Consultant, Character Validator).

## Tech Stack

- **Runtime:** Node.js 20+ (for Agent/Tools), Deno (for Preprocessing)
- **Language:** TypeScript
- **Integration:** Gemini CLI Native Sub-Agent & Skills
- **Data Source:** SRD 5.2.1 Markdown files
- **Data Storage:** Structured JSON (generated via preprocessing)

## Core Workflows

### Setup & Development

1.  **Normalize Markdown:** Prepare raw SRD files for parsing.
    ```bash
    deno task normalize
    ```
2.  **Preprocess Data:** Generate JSON files from normalized markdown.
    ```bash
    deno task preprocess
    ```
3.  **Invoke Sub-Agent:** Use the sub-agent via Gemini CLI.
    ```bash
    /agents call srd-consultant "What does the Prone condition do?"
    ```

## Project Structure

- `agent/`: Core sub-agent implementation (Node.js).
  - `tool-caller.ts`: Main tool execution entry point.
  - `discovery.ts`: Script for Gemini CLI tool discovery.
  - `services/`: Node-compatible business logic (e.g., `spell-service.ts`).
  - `utils/`: Data access and utility layer (`data-loader.ts`).
  - `types/`: Shared TypeScript interfaces and schemas.
- `.gemini/`: Gemini CLI configuration and manifests.
  - `agents/srd-consultant.md`: The sub-agent definition.
  - `settings.json`: Tool discovery and execution configuration.
- `scripts/`: Deno-based preprocessing pipeline.
  - `normalize/`: Markdown normalization logic.
  - `parsers/`: Individual content parsers (Markdown -> JSON).
  - `preprocess.ts`: Main preprocessing orchestrator.
- `srd_reference/`: Source material.
  - `DnD5eSRD_md/`: Raw SRD markdown files.
  - `normalized/`: Pre-processed markdown for parsing.
- `data/`: (Gitignored) Generated JSON files.

## Development Conventions

- **Node Compatibility**: All code in `agent/` must be compatible with Node.js and use `--experimental-strip-types`.
- **Case-Insensitive Lookups**: Game data lookups should be case-insensitive.
- **Input Validation**: Use the validators in `agent/utils/validators.ts` to check tool parameters.
- **Error Handling**: Ensure informative error messages are returned as JSON results for the CLI.

## Key Files for Context

- `deno.json`: Task definitions for preprocessing.
- `CLAUDE.md`: Architectural overview and roadmap.
- `README.md`: High-level overview and setup instructions.
