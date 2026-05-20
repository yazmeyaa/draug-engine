# Draug Engine

This repository contains Draug Engine, a TypeScript game engine focused on clear ECS-based architecture and reusable gameplay building blocks.

The main package is `@draug/engine`, an ECS-first game engine core built around entities, components, systems, resources, events, commands, and plugins. The goal is to keep the engine small and understandable, while still giving a game enough structure to grow beyond a single update loop full of unrelated logic.

## What Is Here

- `packages/engine` contains the source for the published `@draug/engine` package. This is where the ECS core, runtime helpers, event buffers, command queue, and plugin system live.
- `apps/flappy-bird` is a small playground application that I use to test the engine in a browser game scenario.
- `plugins` contains standard Draug plugins, such as the published `@draug/config-plugin`. These are reusable pieces of engine functionality that can be installed into a game instead of being copied between projects.

## Why This Exists

Draug is not trying to be a full editor-driven engine. It is closer to a lightweight foundation for games written in TypeScript.

I want the engine to make common game code easier to organize: data goes into components, frame logic goes into systems, shared state goes into resources, and optional features can be packaged as plugins. The repository also gives me a place to build small example games while the engine API is still evolving.

## Repository Layout

```text
apps/
  flappy-bird/      Example browser game built with the engine

packages/
  engine/           Main @draug/engine package
  types/            Shared helper types

plugins/
  config/           Standard configuration plugin
```

## Using The Packages

The engine is published as an npm package:

```bash
npm install @draug/engine
```

Standard plugins are published separately. For example, the configuration plugin can be installed with:

```bash
npm install @draug/config-plugin
```

## Local Development

The repository itself uses Yarn workspaces for developing the engine, plugins, and example app together.

```bash
yarn install
```

To run the Flappy Bird example from this repository:

```bash
yarn workspace flappy-bird dev
```

To build the engine package locally:

```bash
yarn workspace @draug/engine build
```

## More Details

The engine package has its own README with a more complete API overview and examples: [`packages/engine/README.md`](packages/engine/README.md).

The root README is intentionally short. It is meant to explain what this repository is and where to start, not to document every engine API.
