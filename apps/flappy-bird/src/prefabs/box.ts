import { Transform } from "../components/transform";
import { ColliderRectangle } from "../components/collider";
import { Renderable } from "../components/renderable";
import { applyComponent } from "./shared";
import {
    entry,
    type World,
    type EntityID,
} from "@amber-game/engine";

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