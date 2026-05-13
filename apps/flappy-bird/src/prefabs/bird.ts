import { Transform } from "../components/transform";
import { Acceleration } from "../components/acceleration";
import { FlappyTag } from "../components/flappy-tag";
import { Renderable } from "../components/renderable";
import { Velocity } from "../components/velocity";
import { ColliderRectangle } from "../components/collider";
import { applyComponent } from "./shared";
import {
    entry,
    type World,
    type EntityID,
} from "@draug/engine";

export type CreateBirdParams = {
    transform: Transform;
    renderable: Renderable;
    velocity: Velocity;
    collider: ColliderRectangle;
};

export function createBird(world: World, params: CreateBirdParams): EntityID {
    return world.commands.createEntity(
        entry(Transform, t => applyComponent(t, params.transform)),
        entry(Renderable, r => applyComponent(r, params.renderable)),
        entry(Velocity, v => applyComponent(v, params.velocity)),
        entry(ColliderRectangle, c => applyComponent(c, params.collider)),
        entry(Acceleration),
        entry(FlappyTag),
    );
}