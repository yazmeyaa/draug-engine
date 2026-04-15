import { createEventKey } from "@amber-game/engine/ecs/events-buffer";

type CollisionObject = {
    colliderId: number;
    position: {x: number; y: number;};
};
export type CollisionEvent = {
    objA: CollisionObject;
    objB: CollisionObject;
};
export const COLLISION_EVENT_KEY = createEventKey<CollisionEvent>("CollisionEvent");
