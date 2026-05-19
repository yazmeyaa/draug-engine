# Config Plugin

A standard Draug Engine plugin that provides a centralized, easy-to-use configuration management system for your game or application.

## Overview

The Config Plugin integrates seamlessly with the Draug Engine's ECS (Entity Component System) architecture, giving you a reliable way to store, update, and access game settings throughout your application lifecycle.

### Key Features

- **Centralized Configuration**: Keep all your game settings in one place
- **Two-Phase Updates**: Changes are staged in a pending state and committed atomically, preventing inconsistencies
- **ECS Integration**: Fully integrated with Draug Engine's resource and system architecture
- **Type-Safe**: Built with TypeScript for compile-time safety
- **Lightweight**: Minimal overhead with no external dependencies beyond Draug Engine

## Installation

This plugin is part of the Draug Engine standard plugins collection.

```bash
yarn add @draug/config-plugin
```

## Quick Start

### 1. Register the Plugin

```typescript
import { ConfigPlugin } from '@draug/config-plugin';

// Add the plugin to your Draug engine setup
world.registerPlugin(new ConfigPlugin());
```

### 2. Access Configuration

```typescript
import { ConfigurationResource } from '@draug/config-plugin';

// Inside a system or component
const configResource = world.resources.get(ConfigurationResource);
const config = configResource.config;

// Get a value
const difficulty = config.get('game.difficulty');

// Set a value (will be committed in the next POST phase)
config.set('game.difficulty', 'hard');
```

## How It Works

### Configuration Lifecycle

The plugin uses a **two-phase commit pattern** to ensure consistency:

1. **Set Phase**: When you call `config.set()`, the new value is stored in a pending buffer
2. **Commit Phase**: After all game logic runs, the `ConfigCommitSystem` (which runs in the POST phase) commits all pending changes at once
3. **Get Phase**: Reading with `config.get()` always returns the last committed value

This approach ensures that:
- Your game logic sees consistent configuration throughout a single frame
- Multiple configuration changes are applied atomically
- No partial updates leave your game in an inconsistent state

### Example: Adjusting Game Settings

```typescript
// During your game update
const config = configResource.config;

// Queue up changes
config.set('player.speed', 10);
config.set('player.health', 100);
config.set('difficulty.enemyCount', 5);

// These changes are pending...
// The ConfigCommitSystem automatically commits them
// after all systems have finished processing

// Next frame, when you read these values, you get the updated ones
console.log(config.get('player.speed')); // 10
```

## API Reference

### `Configuration` Class

#### `get(key: string): unknown`
Retrieves a configuration value by key. Returns the last committed value.

#### `set(key: string, value: unknown): void`
Queues a configuration value for update. The change is committed in the next POST phase.

#### `commit(): void`
Manually commits all pending changes to the current configuration. (Usually called automatically by ConfigCommitSystem)

### `ConfigurationResource` Class

A wrapper resource that provides access to the `Configuration` instance through the ECS world.

```typescript
const configResource = world.resources.get(ConfigurationResource);
const config = configResource.config; // Access the Configuration instance
```

## Best Practices

1. **Use Consistent Key Naming**: Use dot-notation for nested concepts
   ```typescript
   config.set('audio.master.volume', 0.8);
   config.set('audio.effects.volume', 0.6);
   ```

2. **Read Values at the Start of Frames**: Since commits happen at the POST phase, read values at the beginning of your update logic for consistency

3. **Use Type Coercion When Needed**: The configuration stores values as `unknown`, so cast as needed:
   ```typescript
   const difficulty = config.get('game.difficulty') as string;
   const maxPlayers = config.get('game.maxPlayers') as number;
   ```

4. **Batch Related Changes**: If multiple settings should change together, set them all before the POST phase commits them

## Architecture

```
ConfigPlugin
├── ConfigurationResource (ECS Resource)
│   └── Configuration (Two-phase storage)
│       ├── current (committed values)
│       └── pending (staged values)
└── ConfigCommitSystem (ECS System - POST phase)
    └── Commits pending → current
```

## License

MIT - Created by yazmeyaa

## Contributing

Part of the Draug Engine ecosystem. Report issues and contribute improvements on GitHub.