import { EntityRef } from "@amber-game/engine/ecs/entity";
import { World } from "@amber-game/engine/ecs/world";
import { Acceleration } from "../components/acceleration";
import { Damage } from "../components/damage";
import { Position } from "../components/position";
import { Velocity } from "../components/velocity";
import { Renderable } from "../components/renderable";

type FireballInitialData = {
    initialPosition: Position;
    velocity: Velocity;
    acceleration?: Acceleration;
    damage: number;
    renderable: Renderable,
};
export function createFireball(world: World, initData: FireballInitialData): EntityRef {
    const entity = new EntityRef(world, world.entities.getId());

    world.addComponent(entity, Position, (o) => {
        const { x, y } = initData.initialPosition;
        [o.x, o.y] = [x, y];
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

    return entity;
}