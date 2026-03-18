import { MovementSystem } from "./systems/movement";
import { AttractionSystem } from "./systems/world-attraction";
import { RenderingSystem } from "./systems/rendering";
import { PlayerTag } from "./components/player-tag";
import { World } from "@amber-game/engine/ecs/world";
import { Acceleration } from "./components/acceleration";

function createBaseWorld(): World {
    const world = new World();
    [PlayerTag, Acceleration].forEach(c => world.components.registerComponent(c));
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

    for (const c of world.systems.getRequiredComponents()) {
        world.components.registerComponent(c);
    }
    return world;
}

export function createServerSideWorld(): World {
    const world = createBaseWorld();
    for (const c of world.systems.getRequiredComponents()) {
        world.components.registerComponent(c);
    }
    return world;
}