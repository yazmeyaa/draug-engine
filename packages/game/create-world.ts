import { MovementSystem } from "./systems/movement";
import { AttractionSystem } from "./systems/world-attraction";
import { PlayerTag } from "./components/tags/player-tag";
import { World } from "@draug/engine";
import { Acceleration } from "./components/physics/acceleration";
import { CircleCollider } from "./components/collision/circle-collider";
import { RectangleCollider } from "./components/collision/rectangle-collider";
import { CircleCollisionSystem } from "./systems/circle-collision";
import { Damage } from "./components/gameplay/damage";
import type { ComponentType } from "@draug/engine";
import { Renderable } from "./components/render/renderable";
import { EntityDebug } from "./components/debug/entity-debug";
import { Health } from "./components/gameplay/health";
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