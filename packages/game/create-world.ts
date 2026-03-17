import { World } from "@/packages/engine/ecs/world";
import { MovementSystem } from "./systems/movement";
import { AttractionSystem } from "./systems/world-attraction";
import { RenderingSystem } from "./systems/rendering";
import { PlayerTag } from "./components/player-tag";

function createBaseWorld(): World {
    const world = new World();
    world.components.registerComponent(PlayerTag)
    const systems = [
        new MovementSystem(),
        new AttractionSystem(),
    ]
    systems.forEach(x => world.systems.register(x));

    return world;
};

export function createClientSideWorld(): World {
    const world = createBaseWorld();
    [
        new RenderingSystem(),
    ].forEach(x => world.systems.register(x));

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