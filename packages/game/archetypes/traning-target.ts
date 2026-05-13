import { Transform } from "../components/render/transform";
import { CircleCollider } from "../components/collision/circle-collider";
import { Health } from "../components/gameplay/health";
import { Renderable } from "../components/render/renderable";
import { EntityDebug } from "../components/debug/entity-debug";
import { applyComponent } from "./shared";
import type { World, EntityID } from "@draug/engine";

export type TrainingTargetInitialData = {
    transform: Transform;
    collider: CircleCollider;
    renderable: Renderable
};

export function createTrainingTarget(world: World, initData: TrainingTargetInitialData): EntityID {
    const id = world.entities.create();

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