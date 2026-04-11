import { EntityRef } from "@amber-game/engine/ecs/entity";
import { World } from "@amber-game/engine/ecs/world";
import { Acceleration } from "../components/acceleration";
import { Damage } from "../components/damage";
import { Transform } from "../components/transform";
import { Velocity } from "../components/velocity";
import { Renderable } from "../components/renderable";
import { EntityDebug } from "../components/entity-debug";

type FireballInitialData = {
    initialPosition: Transform;
    velocity: Velocity;
    acceleration?: Acceleration;
    damage: number;
    renderable: Renderable,
};
export function createFireball(world: World, initData: FireballInitialData): EntityRef {
    const entity = new EntityRef(world, world.entities.getId());

    world.addComponent(entity, Transform, (o) => {
        const { x, y, rotation, scaleX, scaleY } = initData.initialPosition;
        [o.x, o.y, o.rotation, o.scaleX, o.scaleY] = [x, y, rotation, scaleX, scaleY];
        return o;
    })
    world.addComponent(entity, Velocity, (o) => {
        const { vx, vy } = initData.velocity;
        [o.vx, o.vy] = [vx, vy]
        return o;
    })
    world.addComponent(entity, Acceleration, (o) => {
        if (!initData.acceleration)
            return o;
        const { x, y } = initData.acceleration;
        [o.x, o.y] = [x, y];
        return o;
    })
    world.addComponent(entity, Damage, (o) => {
        o.value = initData.damage;
        return o;
    })

    world.addComponent(entity, Renderable, (o) => {
        o.layer = 0;
        o.spriteId = initData.renderable.spriteId;
    })

    world.addComponent(entity, EntityDebug, (o) => {
        o.name = "Fireball";
        return o; 
    });

    return entity;
}