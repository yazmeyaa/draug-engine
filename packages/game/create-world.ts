import { MovementSystem } from "./systems/movement";
import { AttractionSystem } from "./systems/world-attraction";
import { PlayerTag } from "./components/player-tag";
import { World } from "@amber-game/engine/ecs/world";
import { Acceleration } from "./components/acceleration";
import { CircleCollider } from "./components/circle-collider";
import { RectangleCollider } from "./components/rectangle-collider";
import { CircleCollisionSystem } from "./systems/circle-collision";
import { Damage } from "./components/damage";
import type { ComponentType } from "@amber-game/types/class";
import { Renderable } from "./components/renderable";
import { EntityDebug } from "./components/entity-debug";
import { Health } from "./components/health";
import { InputSystem } from "./systems/input";

function createBaseWorld(): World {
    const world = new World();
    [PlayerTag, Acceleration, CircleCollider, RectangleCollider, Damage, Health].forEach(c => world.components.register(c));
    const systems = [
        new MovementSystem(),
        new AttractionSystem(),
        new CircleCollisionSystem(),
    ]
    systems.forEach(x => world.systems.register(x));

    return world;
};

export function createClientSideWorld(): World {
    const world = createBaseWorld();
    [
        new InputSystem()
    ].forEach(x => world.systems.register(x));
    const components: ComponentType[] = [
        ...world.systems.getRequiredComponents(),
        Renderable,
        EntityDebug
    ];

    for (const c of components) {
        world.components.register(c);
    }
    return world;
}

export function createServerSideWorld(): World {
    const world = createBaseWorld();
    for (const c of world.systems.getRequiredComponents()) {
        world.components.register(c);
    }
    return world;
}