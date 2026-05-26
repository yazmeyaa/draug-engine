import { Acceleration } from "../components/acceleration";
import { FlappyTag } from "../components/flappy-tag";
import { Renderable } from "../components/renderable";
import { ColliderRectangle } from "../components/collider";
import { applyComponent } from "./shared";
import {
    entry,
    type World,
    type EntityID,
} from "@draug/engine";
import { Transform, Velocity } from "@draug/engine/std-components";

export type CreateBirdParams = {
    transform: {
        x: number;
        y: number;
    };
    renderable: Renderable;
    velocity: {
        x: number;
        y: number;
    };
    collider: ColliderRectangle;
};

export function createBird(world: World, params: CreateBirdParams): EntityID {
    return world.commands.createEntity(
        entry(Transform, t => t.position.set(params.transform.x, params.transform.y, 0)),
        entry(Renderable, r => applyComponent(r, params.renderable)),
        entry(Velocity, v => v.linear.set(params.velocity.x, params.velocity.y, 0)),
        entry(ColliderRectangle, c => applyComponent(c, params.collider)),
        entry(Acceleration),
        entry(FlappyTag),
    );
}