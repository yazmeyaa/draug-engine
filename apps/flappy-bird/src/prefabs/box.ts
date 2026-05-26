import { Position } from "@draug/engine/std-components";
import { ColliderRectangle } from "../components/collider";
import { Renderable } from "../components/renderable";
import { applyComponent } from "./shared";
import {
    entry,
    type World,
    type EntityID,
} from "@draug/engine";

export type CreateBoxParmas = {
    transform: {
        x: number;
        y: number;
    };
    renderable: Renderable;
    collider: ColliderRectangle;
};

export function createBox(world: World, params: CreateBoxParmas): EntityID {
    return world.commands.createEntity(
        entry(Position, t => t.value.set(params.transform.x, params.transform.y, 0)),
        entry(ColliderRectangle, c => applyComponent(c, params.collider)),
        entry(Renderable, r => applyComponent(r, params.renderable)),
    );
}; 