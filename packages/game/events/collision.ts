import { createEventKey } from "@amber-game/engine";

type CollisionObject = {
    colliderId: number;
    position: {x: number; y: number;};
};
type CollisionEvent = {
    objA: CollisionObject;
    objB: CollisionObject;
};
export const COLLISION_EVENT_KEY = createEventKey<CollisionEvent>("CollisionEvent");
