import { World } from "@/packages/engine/core/ecs/world";
import { MovementSystem } from "./systems/movement";
import { AttractionSystem } from "./systems/world-attraction";
import { RenderingSystem } from "./systems/rendering";

function createBaseWorld(): World {
    const world = new World();

    const systems = [
        new MovementSystem(),
        new AttractionSystem(),
    ]
    systems.forEach(x => world.systems.register(x, world));

    return world;
};

export function createClientSideWorld(): World {
    const world = createBaseWorld();
    [
        new RenderingSystem(),
    ].forEach(x => world.systems.register(x, world));

    for (const c of world.systems.requiredComponents) {
        world.components.registerComponent(c);
    }
    return world;
}

export function createServerSideWorld(): World {
    const world = createBaseWorld();
    for (const c of world.systems.requiredComponents) {
        world.components.registerComponent(c);
    }
    return world;
}