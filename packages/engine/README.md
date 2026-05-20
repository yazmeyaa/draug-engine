# @draug/engine

![NPM Version](https://img.shields.io/npm/v/%40draug%2Fengine?style=flat)
[![Socket Badge](https://badge.socket.dev/npm/package/@draug/engine/1.0.6)](https://badge.socket.dev/npm/package/@draug/engine/1.0.6)

Small ECS-first game skeleton for TypeScript: a `World` holds entities, components (plain data), systems (per-frame logic), double-buffered events, typed resources, and optional plugins. A thin `Runtime` plus `GameLoop` / `Clock` help you step simulation on a steady timer instead of growing everything inside one giant class.

## Features

- **ECS core** — register component storages, attach data to entities, query by `include` / `exclude` / `anyOf`, run systems in dependency order (DAG over `@System` metadata).
- **Deferred commands** — queue structural changes (e.g. `commands.createEntity`) and apply them after systems run, so you do not mutate archetypes mid-iteration.
- **Events** — `EventBus` + `EventBuffer` with a per-frame `swap` (done for you inside `world.update` before systems).
- **Resources** — singleton-style services keyed by constructor (`insert` / `get` / `getOrInsert`).
- **Plugins** — install decorated `PluginBase` classes, resolve dependency order, then `world.build()` instantiates them.

## Installation

```bash
npm install @draug/engine
```

The package is ESM-first (`"type": "module"`) and ships a CommonJS build as well (`exports` in `package.json`).

## Quick start

Enable legacy decorators in `tsconfig.json` (the library uses `experimentalDecorators` today):

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

### Creating an Engine instance

The recommended way to set up your game is to create an `Engine` instance. The `Engine` class encapsulates the `World`, `Runtime`, `Logger`, and `AssetsManager`:

```typescript
import { Engine, Loop } from '@draug/engine';

// Create an engine with a game loop (e.g., using requestAnimationFrame on the web)
const engine = new Engine({
  loop: (callback) => {
    const tick = () => {
      callback();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
});

// Build the engine and start the game loop
engine.init();
engine.start();
```

The `Engine` exposes:
- **`world`** — the ECS world for registering components, systems, entities, resources, etc.
- **`runtime`** — manages the simulation loop and stepping
- **`assets`** — loads and manages game assets (textures, sprites, etc.)
- **`logger`** — debug logging (you can pass a custom logger in the constructor)

### Setting up components and systems

Register components and systems on the `world` before calling `engine.init()`:

```typescript
import { Component, System, SystemBase, entry, type SystemComputeContext } from '@draug/engine';

@Component()
class Position {
  x = 0;
  y = 0;
}

@System({ query: { include: [Position] } })
class GravitySystem extends SystemBase {
  compute({ entities, world, dt }: SystemComputeContext): void {
    const positions = world.components.getStorage(Position);
    for (const id of entities) {
      const p = positions.get(id);
      if (p) p.y += 20 * dt;
    }
  }
}

const engine = new Engine({
  loop: (callback) => {
    const tick = () => {
      callback();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
});

// Register components and systems
engine.world.components.register(Position);
engine.world.systems.register(new GravitySystem());

// Build and start
engine.init(); // calls world.build() internally
engine.start();

// Spawn entities after initialization
const player = engine.world.entities.create();
engine.world.addComponent(player, Position, (p) => {
  p.x = 0;
  p.y = 0;
});
```

**Note:** `world.update` runs systems first, then flushes the command queue. Anything created with `commands.createEntity` only gets components after that flush, so it will not appear in queries until the *next* `update` unless you attach components synchronously.

## Usage / API

### Engine

`Engine` is the main entry point for your game. It encapsulates `World`, `Runtime`, `Logger`, and `AssetsManager`:

```typescript
import { Engine } from '@draug/engine';

const engine = new Engine({
  loop: (callback) => requestAnimationFrame(callback),
  logger: customLogger, // optional; defaults to NoopLogger
});

// After registering components, systems, and plugins on engine.world:
engine.init();    // calls world.build() to initialize systems
engine.start();   // starts the runtime loop
```

Methods:
- **`init()`** — builds the world (runs plugin initialization and system setup)
- **`start()`** — starts the game loop

Properties:
- **`world`** — the ECS `World` instance for entities, components, systems, resources, events, commands, and queries
- **`runtime`** — `Runtime` instance managing the simulation loop
- **`assets`** — `AssetsManager` for loading and managing game assets
- **`logger`** — `Logger` instance for debug logging

### World

`World` is the façade: `entities`, `components`, `systems`, `events`, `resources`, `commands`, `queries`, `plugins`.

- **`world.query(params)`** — bitmask-backed query; supports `include`, `exclude`, `anyOf`, `excludeEntitiesIds`, and `filter`.
- **`world.addComponent(id, ComponentClass, init?)` / `removeComponent`** — structural changes; queries are invalidated for you.
- **`world.update(dt)`** — `events.swapAll()`, run systems in order, then `commands.flush`.

### Components

Mark data classes with `@Component()` so the ECS can assign stable type ids:

```typescript
import { Component, ComponentStorageType } from '@draug/engine';

@Component()
class Health {
  current = 100;
  max = 100;
}

engine.world.components.register(Health);
```

Optional **singleton** storage (one instance, not per-entity):

```typescript
import { Component, ComponentStorageType } from '@draug/engine';

@Component()
class GlobalRNG {
  next() {
    return Math.random();
  }
}

engine.world.components.register(GlobalRNG, {
  storageType: ComponentStorageType.SINGLETON_STORAGE,
  factory: () => new GlobalRNG(),
});
```

### Systems

Extend `SystemBase`, implement `compute`, and decorate with `@System`:

```typescript
import { System, SystemBase, type SystemComputeContext } from '@draug/engine';

@System({
  query: { include: [Position, Health] },
  requiredComponents: [SomeTag],
  computeAfter: [PhysicsSystem],
})
class ApplyDamageSystem extends SystemBase {
  compute(ctx: SystemComputeContext): void {
    const { entities, world, dt } = ctx;
    // ...
  }
}

engine.world.systems.register(new ApplyDamageSystem());
```

- **`query`** — drives which entity ids are passed into `compute`.
- **`requiredComponents`** — ensures storages exist and documents extra reads that are not part of the query mask.
- **`computeAfter`** — ordering edges between system classes (both must be registered).

Call **`engine.init()`** after registering all systems so `onInit` hooks run and execution order is computed.

### Commands

```typescript
import { entry } from '@draug/engine';

engine.world.commands.add((w) => {
  const id = w.entities.create();
  w.addComponent(id, Health, (h) => {
    h.current = 50;
  });
});

const id = engine.world.commands.createEntity(
  entry(Position, (p) => {
    p.x = 0;
  }),
);
```

### Events

```typescript
import { createEventKey } from '@draug/engine';

const DamageDealt = createEventKey<{ target: number; amount: number }>();

const incoming = engine.world.events.getBuffer(DamageDealt);
incoming.write({ target: 1, amount: 7 });

// Normally you only read after the bus swaps at the start of world.update.
engine.world.events.swapAll();
for (const e of incoming.read()) {
  console.log(e.amount);
}
```

### Plugins

```typescript
import { Plugin, PluginBase } from '@draug/engine';

@Plugin({
  id: 'audio',
  version: '1.0.0',
  name: 'Audio bootstrap',
})
class AudioPlugin extends PluginBase {}

engine.world.plugins.install(AudioPlugin /*, ...ctor args if any */);
engine.init(); // builds plugins, then initializes world
```

After `engine.init()`, resolve instances with `engine.world.plugins.getPluginInstance(AudioPlugin)` (or by string id). Lifecycle hooks (`onPluginLoad`, etc.) live on `PluginBase` for you to call from your game code if you want explicit phases—the engine focuses on construction order and DAG validation.

### Game loop & Runtime

`Runtime` is integrated into the `Engine` class. The `Engine` manages the simulation loop and stepping based on the `Loop` function you provide:

```typescript
import { Engine } from '@draug/engine';

const engine = new Engine({
  loop: (callback) => {
    // On the web with requestAnimationFrame:
    const tick = () => {
      callback();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
});

engine.init();
engine.start();
// engine.runtime.stop() when shutting down
```

For custom time sources or advanced loop control, you can also use `Clock` and `GameLoop` directly (though this is less common with the `Engine` API):

```typescript
import { Clock, GameLoop, World } from '@draug/engine';

const world = new World();
const clock = new Clock({ now: () => performance.now() });

const loop = new GameLoop(clock, (dt) => {
  world.update(dt);
});

loop.start((cb) => {
  requestAnimationFrame(cb);
});

// loop.stop() when shutting down
```

In Node, `performance.now()` is available on modern versions; otherwise pass `{ now: () => Date.now() }` (millisecond resolution).

## Configuration

| Area | What you can tune |
|------|---------------------|
| **Engine** | `new Engine({ loop, logger? })` — configure the game loop and optional debug logger. |
| **World** | `new World(maxEntityCount?)` — caps sparse sets / bitmaps (default is large; lower for fixed small games if you care about memory). |
| **Components** | `components.register(Type, { factory })` for pooled defaults; `ComponentStorageType.SINGLETON_STORAGE` + `factory` for global state. |
| **Systems** | `@System({ query, requiredComponents, computeAfter })` for selection, extra storages, and ordering. |
| **Assets** | `engine.assets.load(...)` for loading game assets (textures, sprites, etc.). |
| **Logging** | Pass a custom logger to the `Engine` constructor to override the default `NoopLogger`. |

## Best practices

1. **Create an Engine instance once** — it manages your world, runtime, and assets. Reuse the same instance throughout your game session.
2. **Register components before first `getStorage`** — registration is explicit; the world will throw if a system touches an unknown component type.
3. **Treat commands as "end of frame"** — if something must exist in the same system pass, use `addComponent` / `entities.create` directly (or split into a later system).
4. **Call `engine.init()` before `engine.start()`** — initialization builds the world and sets up plugins and systems.

## Contributing

Issues and PRs are welcome in the [GitHub repository](https://github.com/yazmeyaa). If you change public API or query behaviour, add or update a small reproduction so we can turn it into a regression test later (the package is still light on automated tests).

## Author & support

- **Author:** future_undefined — [GitHub @yazmeyaa](https://github.com/yazmeyaa) · [evgenijantonenkov456@gmail.com](mailto:evgenijantonenkov456@gmail.com)

Related workspace packages: `@draug/types` (WebSocket `RawData` helper for networking code). Everything this library exposes to apps is listed in `src/index.ts` in the repository.

## License

GPL-3.0-only — see [LICENSE](https://www.gnu.org/licenses/gpl-3.0.html) for the full text.
