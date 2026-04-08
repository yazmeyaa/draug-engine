import type { EntityID } from "@amber-game/engine/ecs/entity";
import type { World } from "@amber-game/engine/ecs/world";
import { Position } from "../components/position";
import { CircleCollider } from "../components/circle-collider";
import { Health } from "../components/health";

export type TrainingTargetInitialData = {
    position: Position;
    collider: CircleCollider;
};

export function createTrainingTarget(world: World, initData: TrainingTargetInitialData): EntityID {
    const id = world.entities.getId();

    world.addComponent(id, Position, (o) => {
        const { x, y } = initData.position;
        o.x = x;
        o.y = y;
    });
    world.addComponent(id, CircleCollider, (o) => {
        o.radius = initData.collider.radius;
    });
    world.addComponent(id, Health, (o) => {
        o.hp = Math.pow(2, 32);
    })

    return id;
}