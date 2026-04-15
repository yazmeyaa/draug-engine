import type { EntityID } from "@amber-game/engine/ecs/entity"
import type { World } from "@amber-game/engine/ecs/world"
import { Transform } from "../components/transform";
import { Acceleration } from "../components/acceleration";
import { FlappyTag } from "../components/flappy-tag";
import { Renderable } from "../components/renderable";
import { Velocity } from "../components/velocity";
import { ColliderRectangle } from "../components/collider";
import { entry } from "@amber-game/engine/ecs/command";
import { applyComponent } from "./shared";

export type CreateBirdParams = {
    transform: Transform;
    renderable: Renderable;
    velocity: Velocity;
    collider: ColliderRectangle;
};

export function createBird(world: World, params: CreateBirdParams): EntityID {
    return world.commands.createEntity(
        entry(Transform, (t) => applyComponent(t, params.transform)),
        entry(Acceleration),
        entry(FlappyTag),
        entry(Renderable, r => applyComponent(r, params.renderable)),
        entry(Velocity, v => applyComponent(v, params.velocity)),
        entry(ColliderRectangle, c => applyComponent(c, params.collider)),
    );
}