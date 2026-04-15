import type { EntityID } from "@amber-game/engine/ecs/entity";
import type { World } from "@amber-game/engine/ecs/world";
import { Transform } from "../components/transform";
import { ColliderRectangle } from "../components/collider";
import { Renderable } from "../components/renderable";
import { entry } from "@amber-game/engine/ecs/command";
import { applyComponent } from "./shared";

export type CreateBoxParmas = {
    transform: Transform;
    renderable: Renderable;
    collider: ColliderRectangle;
};

export function createBox(world: World, params: CreateBoxParmas): EntityID {
    return world.commands.createEntity(
        entry(Transform, t => applyComponent(t, params.transform)),
        entry(ColliderRectangle, c => applyComponent(c, params.collider)),
        entry(Renderable, r => applyComponent(r, params.renderable)),
    );
}; 