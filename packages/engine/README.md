# @draug/engine

![NPM Version](https://img.shields.io/npm/v/%40draug%2Fengine?style=flat)
[![Socket Badge](https://badge.socket.dev/npm/package/@draug/engine/1.0.6)](https://badge.socket.dev/npm/package/@draug/engine/1.0.6)

Small ECS-first game skeleton for TypeScript: a `World` holds entities, components (plain data), systems (per-frame logic), double-buffered events, typed resources, and optional plugins. A thin `Runtime` plus `Loop` / `Clock` help you step simulation on a steady timer instead of growing everything inside one giant class.

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

Minimal world: register every component type once, register systems, call `systems.build()`, spawn entities, then step with `world.update(clock)`.

```typescript
import {
  World,
  Clock,
  Component,
  System,
  SystemBase,
  entry,
  type SystemComputeContext,
} from '@draug/engine';

@Component({ name: 'Position' })
class Position {
  x = 0;
  y = 0;
}

@System({
  name: 'GravitySystem',
  query: { include: [Position] },
})
class GravitySystem extends SystemBase {
  compute({ entities, world, time }: SystemComputeContext): void {
    const positions = world.components.getStorage(Position);
    for (const id of entities) {
      const p = positions.get(id);
      if (p) p.y += 20 * time.delta;
    }
  }
}

const world = new World({
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
});
const clock = new Clock({ now: () => performance.now() });

world.components.register(Position);
world.systems.register(new GravitySystem());
world.systems.build();

// Same-frame visibility: create entity, then attach components immediately.
const player = world.createEntity();
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

clock.tick();
world.update(clock);
clock.tick();
world.update(clock);
```

**Note:** `world.update` runs systems first, then flushes the command queue. Anything created with `commands.createEntity` only gets components after that flush, so it will not appear in queries until the *next* `update` unless you attach components synchronously.

## Usage / API

### World

`World` is the façade: `entities`, `components`, `systems`, `events`, `resources`, `commands`, `queries`, `plugins`.

- **`world.query(params)`** — bitmask-backed query; supports `include`, `exclude`, `anyOf`, `excludeEntitiesIds`, and `filter`.
- **`world.addComponent(id, ComponentClass, init?)` / `removeComponent`** — structural changes; queries are invalidated for you.
- **`world.update(clock)`** — run systems in order, then `commands.flush`.

### Components

Mark data classes with `@Component({ name })` so the ECS can assign stable type ids:

```typescript
import { Component } from '@draug/engine';

// `world` is your World instance from the quick start.

@Component({ name: 'Health' })
class Health {
  current = 100;
  max = 100;
}

world.components.register(Health);
```

You can optionally override the instance factory used by a storage:

```typescript
@Component({ name: 'Projectile' })
class Projectile {
  speed = 600;
}

world.components.register(Projectile, {
  factory: () => new Projectile(),
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
  const id = w.createEntity();
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

`Clock` measures delta time from a `TimeSource`; `Loop` invokes your step function and asks the host for the next frame (`requestAnimationFrame`, `queueMicrotask` in tests, etc.).

```typescript
import { Clock, Loop, World } from '@draug/engine';

const world = new World({
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
});
const clock = new Clock({ now: () => performance.now() });

const loop = new Loop(
  clock,
  (_dt, worldRef) => {
    worldRef.update(clock);
  },
  (cb) => requestAnimationFrame(cb),
);

loop.start(world);

// loop.stop() when shutting down
```

In Node, `performance.now()` is available on modern versions; otherwise pass `{ now: () => Date.now() }` (millisecond resolution).

### Runtime (optional)

`Runtime` is a tiny wrapper over `Loop`: `runtime.run(world)` starts the configured loop. In the Amber workspace it is usually constructed together with `AssetsManager` from this package for loading textures and similar; for a headless server or a toy sim you can ignore `Runtime` and drive `world.update(clock)` directly from your own driver.

### Standard library entry points

Besides the root entry (`@draug/engine`), the package also publishes focused stdlib entry points:

```typescript
import { Position, Velocity, Rotation } from '@draug/engine/std-components';
import { MovementSystem } from '@draug/engine/std-systems';
import { Vector2, Vector3, Vector4 } from '@draug/engine/std-math';
import { injectStd } from '@draug/engine/std-utils';
```

## Configuration

| Area | What you can tune |
|------|---------------------|
| **World** | `new World({ logger, maxEntityCount? })` — caps sparse sets / bitmaps (default is large; lower for fixed small games if you care about memory). |
| **Components** | `components.register(Type, { factory })` for custom instance factories. |
| **Systems** | `@System({ query, requiredComponents, computeAfter })` for selection, extra storages, and ordering. |
| **Clock / loop** | Inject any `TimeSource`; drive the loop with the scheduling primitive your platform gives you. |

## Best practices

1. **Default to deferred structural changes via `world.commands`** — for spawning/despawning and similar graph mutations, prefer command-queue flow so structural changes happen after systems finish the frame.
2. **Treat direct `world.createEntity` / `world.addComponent` in runtime systems as a rare exception** — it is allowed, but reserve it for deliberate same-frame requirements; otherwise keep mutations deferred to avoid mid-frame state shape changes.
3. **Register component storages before system execution starts** — registration is explicit; touching an unknown component storage at runtime throws. A common pattern is: register components -> register systems -> `world.systems.build()` -> spawn initial entities.
4. **Call `world.systems.build()` once after registration and before the first tick** — this computes system order and runs `onInit` hooks exactly once per system instance.
5. **Treat events as frame-delayed messages** — write to buffers during frame N, read them on frame N+1 after buffer swap. Design gameplay logic around that one-frame latency to avoid hidden ordering bugs.
6. **Keep systems data-oriented and side-effect-light** — put mutable game data in components/resources; keep `compute` focused on deterministic state transitions over `ctx.entities`.
7. **Cache storages/resources in `onInit` when possible** — resolve storages/resources once and reuse references in `compute` to reduce repeated lookups and make intent explicit.
8. **Express ordering explicitly (`computeAfter` / `computeBefore` + phase)** — if one system consumes another system's output, encode that dependency in metadata instead of relying on registration order.
9. **Use `resources.getOrInsert` for singleton-like services/state** — this keeps ownership explicit and avoids ad-hoc globals leaking into gameplay code.
10. **Prefer stable `filter` predicates in queries** — keep predicates pure and cheap; if filtering depends on frequent mutable state, consider encoding it as components to leverage bitmap cache effectiveness.
11. **Use `world.commands.createEntity(entry(...))` as the ergonomic default for spawning** — this helper is just sugar over command queue behavior, but it keeps spawn code concise and type-safe.

### Rule of thumb for entity creation

- **Default:** use command queue for spawning (usually `world.commands.createEntity(...)` with `entry(...)`).
- **Use immediate creation (`world.createEntity` + `world.addComponent`) only when:**
  - you are in world/bootstrap setup before the loop starts, or
  - the entity must be visible to systems in the same frame by design.
- **In runtime systems, immediate creation is a rare exception.**
- **If unsure, choose deferred creation.** It tends to produce safer frame boundaries and fewer ordering surprises.

### Anti-patterns

- **Do not mutate system metadata at runtime** — avoid changing `query` / `requiredComponents` / dependency sets after registration; treat `@System(...)` metadata as immutable configuration.
- **Do not call `world.systems.build()` every frame** — build once for setup (or after explicit dynamic system graph changes), not inside regular gameplay ticks.
- **Do not rely on registration order for correctness** — encode ordering through `computeAfter` / `computeBefore` / `phase` so behavior stays explicit and stable.
- **Do not expect same-frame visibility from deferred commands** — entities/components created via command queue become visible after flush; if you need immediate visibility, use direct APIs intentionally.
- **Do not perform structural mutations through internal managers in game logic** — prefer `World` facade and commands (`world.createEntity`, `world.addComponent`, `world.commands.*`) over mixing direct manager internals in gameplay code.

## Contributing

Issues and PRs are welcome in the [GitHub repository](https://github.com/yazmeyaa). If you change public API or query behaviour, add or update a small reproduction so we can turn it into a regression test later (the package is still light on automated tests).

## Author & support

- **Author:** future_undefined — [GitHub @yazmeyaa](https://github.com/yazmeyaa) · [evgenijantonenkov456@gmail.com](mailto:evgenijantonenkov456@gmail.com)

Related workspace packages: `@draug/types` (WebSocket `RawData` helper for networking code). Everything this library exposes to apps is listed in `src/index.ts` in the repository.

## License

Apache License 2.0 — see [LICENSE](./LICENSE) for the full text.