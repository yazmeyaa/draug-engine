import type { EntityID } from "@amber-game/engine/ecs/entity";
import type { World } from "@amber-game/engine/ecs/world";
import { Transform } from "../components/transform";
import { CircleCollider } from "../components/circle-collider";
import { Health } from "../components/health";
import { Renderable } from "../components/renderable";
import { EntityDebug } from "../components/entity-debug";

export type TrainingTargetInitialData = {
    transform: Transform;
    collider: CircleCollider;
    renderable: Renderable
};

export function createTrainingTarget(world: World, initData: TrainingTargetInitialData): EntityID {
    const id = world.entities.getId();

    world.addComponent(id, Transform, (o) => {
        const { x, y } = initData.transform;
        o.x = x;
        o.y = y;
    });
    world.addComponent(id, CircleCollider, (o) => {
        o.radius = initData.collider.radius;
    });
    world.addComponent(id, Health, (o) => {
        o.hp = Math.pow(2, 32);
    })
    world.addComponent(id, Renderable, (o) => {
        o.layer = initData.renderable.layer
        o.spriteId = initData.renderable.spriteId
    })

    world.addComponent(id, EntityDebug, (o) => {
        o.name = "Training_Target_01"
    })

    return id;
}