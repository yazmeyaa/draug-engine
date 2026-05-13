import { Acceleration } from "../components/physics/acceleration";
import { Damage } from "../components/gameplay/damage";
import { Transform } from "../components/render/transform";
import { Velocity } from "../components/physics/velocity";
import { Renderable } from "../components/render/renderable";
import { EntityDebug } from "../components/debug/entity-debug";
import { applyComponent } from "./shared";
import { BaseSpeed } from "../components/gameplay/base-speed";
import { type World, EntityRef } from "@draug/engine";

type FireballInitialData = {
    transform: Transform;
    velocity: Velocity;
    acceleration?: Acceleration;
    damage: Damage;
    renderable: Renderable;
    baseSpeed: BaseSpeed;
};
export function createFireball(world: World, initData: FireballInitialData): EntityRef {
    const entity = new EntityRef(world, world.entities.create());

    world.addComponent(entity, Transform, (o) => applyComponent(o, initData.transform));
    world.addComponent(entity, Velocity, (o) => applyComponent(o, initData.velocity));
    world.addComponent(entity, Acceleration, (o) => applyComponent(o, initData.acceleration));
    world.addComponent(entity, Damage, (o) => applyComponent(o, initData.damage));
    world.addComponent(entity, Renderable, (o) => applyComponent(o, initData.renderable))
    world.addComponent(entity, EntityDebug, (o) => {
        o.name = "Fireball";
        o.description = "Classic fireball, flying to target to burn them down!"
    });
    world.addComponent(entity, BaseSpeed, (o) => applyComponent(o, initData.baseSpeed));

    return entity;
}