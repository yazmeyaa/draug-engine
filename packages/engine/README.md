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

Minimal world: register every component type once, register systems, call `systems.build()`, spawn entities, then step with `world.update(dt)`.

```typescript
import {
  World,
  Component,
  System,
  SystemBase,
  entry,
  type SystemComputeContext,
} from '@draug/engine';

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

const world = new World();

world.components.register(Position);
world.systems.register(new GravitySystem());
world.systems.build();

// Same-frame visibility: create entity, then attach components immediately.
const player = world.entities.create();
world.addComponent(player, Position, (p) => {
  p.x = 0;
  p.y = 0;
});

// Or defer to end-of-frame (handy when spawning from inside a system):
world.commands.createEntity(
  entry(Position, (p) => {
    p.x = 100;
    p.y = 0;
  }),
);

world.update(1 / 60);
world.update(1 / 60);
```

**Note:** `world.update` runs systems first, then flushes the command queue. Anything created with `commands.createEntity` only gets components after that flush, so it will not appear in queries until the *next* `update` unless you attach components synchronously.

## Usage / API

### World

`World` is the façade: `entities`, `components`, `systems`, `events`, `resources`, `commands`, `queries`, `plugins`.

- **`world.query(params)`** — bitmask-backed query; supports `include`, `exclude`, `anyOf`, `excludeEntitiesIds`, and `filter`.
- **`world.addComponent(id, ComponentClass, init?)` / `removeComponent`** — structural changes; queries are invalidated for you.
- **`world.update(dt)`** — `events.swapAll()`, run systems in order, then `commands.flush`.

### Components

Mark data classes with `@Component()` so the ECS can assign stable type ids:

```typescript
import { Component, ComponentStorageType } from '@draug/engine';

// `world` is your World instance from the quick start.

@Component()
class Health {
  current = 100;
  max = 100;
}

world.components.register(Health);
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

world.components.register(GlobalRNG, {
  storageType: ComponentStorageType.SINGLETON_STORAGE,
  factory: () => new GlobalRNG(),
});
```

### Systems

Extend `SystemBase`, implement `compute`, and decorate with `@System`:

```typescript
import { System, SystemBase, type SystemComputeContext } from '@draug/engine';

// `Position`, `Health`, `SomeTag`, `PhysicsSystem` are your own component/system types.

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
```

- **`query`** — drives which entity ids are passed into `compute`.
- **`requiredComponents`** — ensures storages exist and documents extra reads that are not part of the query mask.
- **`computeAfter`** — ordering edges between system classes (both must be registered).

Call **`world.systems.build()`** after you finish registering systems so `onInit` hooks run and execution order is computed.

### Commands

```typescript
import { entry } from '@draug/engine';

world.commands.add((w) => {
  const id = w.entities.create();
  w.addComponent(id, Health, (h) => {
    h.current = 50;
  });
});

const id = world.commands.createEntity(
  entry(Position, (p) => {
    p.x = 0;
  }),
);
```

### Events

```typescript
import { createEventKey } from '@draug/engine';

const DamageDealt = createEventKey<{ target: number; amount: number }>();

const incoming = world.events.getBuffer(DamageDealt);
incoming.write({ target: 1, amount: 7 });

// Normally you only read after the bus swaps at the start of `world.update`.
world.events.swapAll();
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

world.plugins.install(AudioPlugin /*, ...ctor args if any */);
world.build(); // builds plugins, then call your own game bootstrap as needed
```

After `world.build()`, resolve instances with `world.plugins.getPluginInstance(AudioPlugin)` (or by string id). Lifecycle hooks (`onPluginLoad`, etc.) live on `PluginBase` for you to call from your game code if you want explicit phases—the engine focuses on construction order and DAG validation.

### Game loop

`Clock` measures delta time from a `TimeSource`; `GameLoop` invokes your step function and asks the host for the next frame (`requestAnimationFrame`, `queueMicrotask` in tests, etc.).

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

### Runtime (optional)

`Runtime` is a tiny wrapper: `update(dt)` forwards to `world.update(dt)`. In the Amber workspace it is usually constructed together with `AssetsManager` from this package for loading textures and similar; for a headless server or a toy sim you can ignore `Runtime` and call `world.update` directly from your own driver.

## Configuration

| Area | What you can tune |
|------|---------------------|
| **World** | `new World(maxEntityCount?)` — caps sparse sets / bitmaps (default is large; lower for fixed small games if you care about memory). |
| **Components** | `components.register(Type, { factory })` for pooled defaults; `ComponentStorageType.SINGLETON_STORAGE` + `factory` for global state. |
| **Systems** | `@System({ query, requiredComponents, computeAfter })` for selection, extra storages, and ordering. |
| **Clock / loop** | Inject any `TimeSource`; drive the loop with the scheduling primitive your platform gives you. |

## Best practices

1. **Register components before first `getStorage`** — registration is explicit; the world will throw if a system touches an unknown component type.
2. **Treat commands as “end of frame”** — if something must exist in the same system pass, use `addComponent` / `entities.create` directly (or split into a later system).

## Contributing

Issues and PRs are welcome in the [GitHub repository](https://github.com/yazmeyaa). If you change public API or query behaviour, add or update a small reproduction so we can turn it into a regression test later (the package is still light on automated tests).

## Author & support

- **Author:** future_undefined — [GitHub @yazmeyaa](https://github.com/yazmeyaa) · [evgenijantonenkov456@gmail.com](mailto:evgenijantonenkov456@gmail.com)

Related workspace packages: `@draug/types` (WebSocket `RawData` helper for networking code). Everything this library exposes to apps is listed in `src/index.ts` in the repository.

## License

GPL-3.0-only — see [LICENSE](https://www.gnu.org/licenses/gpl-3.0.html) for the full text.
