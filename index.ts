import { System } from "./packages/engine/core/ecs/system";
import { World } from "./packages/engine/core/ecs/world";
import { ClassType } from "./packages/types/class";

class Position { constructor(public x = 0, public y = 0) {} }
class Velocity { constructor(public vx = 0, public vy = 0) {} }
class Health { constructor(public hp = 100) {} }

const world = new World();

world.components.registerComponent(Position, {});
world.components.registerComponent(Velocity, {});
world.components.registerComponent(Health, {});

class MovementSystem extends System {
    public readonly requiredComponents = [Position, Velocity];
    compute(world: World, entities: number[]): void {}
}

class CombatSystem extends System {
    public readonly requiredComponents = [Position, Health];
    compute(world: World, entities: number[]): void {}
}

const moveSys = new MovementSystem("movement");
const combatSys = new CombatSystem("combat");

world.systems.register(moveSys, world);
world.systems.register(combatSys, world);
world.systems.build();

// --- Создаём много сущностей ---
const TOTAL = 200_000;

for (let i = 0; i < TOTAL; i++) {
    const comps: ClassType<any>[] = [Position];

    if (i % 2 === 0) comps.push(Velocity);
    if (i % 3 === 0) comps.push(Health);

    world.entities.createEntity(world, comps);
}

// --- Тестируем performance ---
const ITER = 1000;
const res: number[] = [];

for (let i = 0; i < ITER; i++) {
    const start = performance.now();
    world.systems.update(world);
    const delta = performance.now() - start;
    res.push(delta);
}

const avg = res.reduce((acc, curr) => acc + curr, 0) / res.length;
console.log(`Average update time for ${TOTAL} entities: ${avg.toFixed(3)} ms`);