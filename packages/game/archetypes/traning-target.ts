import type { EntityID } from "@amber-game/engine/ecs/entity";
import type { World } from "@amber-game/engine/ecs/world";
import { Transform } from "../components/transform";
import { CircleCollider } from "../components/circle-collider";
import { Health } from "../components/health";
import { Renderable } from "../components/renderable";
import { EntityDebug } from "../components/entity-debug";
import { applyComponent } from "./shared";

export type TrainingTargetInitialData = {
    transform: Transform;
    collider: CircleCollider;
    renderable: Renderable
};

export function createTrainingTarget(world: World, initData: TrainingTargetInitialData): EntityID {
    const id = world.entities.getId();

    world.addComponent(id, Transform, (o) => applyComponent(o, initData.transform));
    world.addComponent(id, CircleCollider, (o) => applyComponent(o, initData.collider));
    world.addComponent(id, Health, (o) => {
        o.hp = Math.pow(2, 32);
    })
    world.addComponent(id, Renderable, (o) => applyComponent(o, initData.renderable))
    world.addComponent(id, EntityDebug, (o) => {
        o.name = "Training_Target_01"
    })

    return id;
}