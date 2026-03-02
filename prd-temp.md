# SRD Gemini Sub-agent PRD

## HR Eng

| SRD Gemini Sub-agent PRD |  | Convert an existing D&D 5e SRD MCP server into a native Gemini CLI extension sub-agent to improve efficiency and support the development of a character management website backend. |
| :---- | :---- | :---- |
| **Author**: Hendrix **Contributors**: Pickle Rick **Intended audience**: Engineering | **Status**: Draft **Created**: March 1, 2026 | **Self Link**: N/A **Context**: Existing srd-mcp project [**Visibility**](http://go/data-security-policy#data-classification): Need to know |

## Introduction

The current project provides access to D&D 5e System Reference Document (SRD 5.2.1) data via a Model Context Protocol (MCP) server. While functional, interacting with this data via MCP introduces overhead and pollutes the primary agent's tool space. This project aims to convert the existing data access logic and tool definitions into a native Gemini CLI extension that functions as a **Dedicated Rules Reference Sub-agent**. This sub-agent will allow the primary Gemini CLI agent to seamlessly delegate D&D queries (rules, spells, classes, etc.) to a specialized expert, specifically to assist in building a backend server for a character management website.

## Problem Statement

**Current Process:** D&D SRD data is exposed via a standalone Deno-based MCP server that must be run alongside the AI assistant.
**Primary Users:** Developers (specifically, building a character management website backend).
**Pain Points:** 
- Running a separate process (MCP server).
- Communication overhead and latency inherent in the MCP protocol vs. native tool execution.
- Cluttering the main agent's context and tool list with hyper-specific D&D tools.
**Importance:** Efficiency and encapsulation. A dedicated sub-agent executes natively, keeps the main agent focused, and seamlessly handles deep D&D lore and mechanics queries.

## Objective & Scope

**Objective:** To completely replace the MCP server interface with a Gemini CLI Extension that exposes a **Sub-agent** (e.g., `srd_reference_agent`). This sub-agent will possess the skills and tools required to query the existing pre-processed JSON data.
**Ideal Outcome:** A locally installable Gemini extension that registers a sub-agent. The main agent can delegate tasks to this sub-agent to query spells, classes, species, backgrounds, feats, and combat rules.

### In-scope or Goals
- Port all existing tools from `src/tools/registry.ts` to be tools owned by the new sub-agent.
- Adapt the Deno service layer (`src/services/*`) to Node.js/TypeScript functions within the Gemini extension environment.
- Adapt the `DataLoader` (`src/data/data-loader.ts`) to read the generated JSON files efficiently in Node.js.
- Create the `gemini-extension.json` configuring the sub-agent.

### Not-in-scope or Non-Goals
- Modifying the underlying SRD data or the markdown parsing/preprocessing pipeline (`scripts/`).
- Expanding the data set beyond what the current MCP server supports.

## Product Requirements

The new extension must expose the following capabilities:

### Critical User Journeys (CUJs)
1. **Developer delegates a complex rules query**: The developer asks Gemini "What are the details of the Fireball spell and how does it interact with cover?". Gemini delegates this to the `srd_reference_agent`, which uses its specific tools to fetch the spell and cover rules, synthesizing a complete answer.
2. **Backend Development Assistance**: While writing backend code, the main agent needs the exact JSON structure for the 'Barbarian' class to generate a database schema. It invokes the `srd_reference_agent` to retrieve the pure JSON output.

### Functional Requirements

| Priority | Requirement | User Story |
| :---- | :---- | :---- |
| P0 | Extension & Sub-agent Scaffold | As a developer, I want a valid `gemini-extension.json` that registers a new sub-agent for SRD data. |
| P0 | Data Loading | As the sub-agent, I need to read the preprocessed JSON files from the `data/` directory. |
| P0 | Sub-agent Tools | As the sub-agent, I need tools to list, search, and get details for spells, classes, species, backgrounds, feats, and combat rules. |

## Assumptions

- The existing generated JSON data in the `data/` directory is correct.
- The Gemini CLI extension runtime (Node.js) is compatible with the core logic currently written for Deno.

## Risks & Mitigations

- **Risk**: Deno to Node.js compatibility issues. -> **Mitigation**: Carefully translate `Deno.readTextFile` to Node's `fs.promises.readFile`.
- **Risk**: Context loss during sub-agent delegation. -> **Mitigation**: Ensure the sub-agent is instructed to return structured, high-signal data (like pure JSON or concise rule summaries) back to the main agent.

## Business Benefits/Impact/Metrics

**Success Metrics:** Faster agent iteration loops and a cleaner main-agent tool space.

## Stakeholders / Owners

| Name | Team/Org | Role | Note |
| :---- | :---- | :---- | :---- |
| Hendrix | Solo | Developer | Primary user building the backend. |
| Pickle Rick | God Tier | Lead Architect | Doing all the actual work. |