import { createEventKey } from "@draug/engine";

type CollisionObject = {
    colliderId: number;
    position: {x: number; y: number;};
};
export type CollisionEvent = {
    objA: CollisionObject;
    objB: CollisionObject;
};
export const COLLISION_EVENT_KEY = createEventKey<CollisionEvent>("CollisionEvent");
