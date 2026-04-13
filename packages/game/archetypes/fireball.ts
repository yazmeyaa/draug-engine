import { EntityRef } from "@amber-game/engine/ecs/entity";
import { World } from "@amber-game/engine/ecs/world";
import { Acceleration } from "../components/acceleration";
import { Damage } from "../components/damage";
import { Transform } from "../components/transform";
import { Velocity } from "../components/velocity";
import { Renderable } from "../components/renderable";
import { EntityDebug } from "../components/entity-debug";
import { applyComponent } from "./shared";
import { BaseSpeed } from "../components/base-speed";

type FireballInitialData = {
    transform: Transform;
    velocity: Velocity;
    acceleration?: Acceleration;
    damage: Damage;
    renderable: Renderable;
    baseSpeed: BaseSpeed;
};
export function createFireball(world: World, initData: FireballInitialData): EntityRef {
    const entity = new EntityRef(world, world.entities.getId());

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