import { EntityRef } from "@amber-game/engine/ecs/entity";
import { World } from "@amber-game/engine/ecs/world";
import { NetworkEntity } from "../components/network-entity";
import { PlayerTag } from "../components/player-tag";
import { Position } from "../components/position";
import { Renderable } from "../components/renderable";
import { Velocity } from "../components/velocity";
import { AttractorObject } from "../components/attrcator";
import { CircleCollider } from "../components/circle-collider";


export type PlayerInitialData = {
    position: Position;
    velocity?: Velocity;
    renderable?: Renderable;
    networkId?: number;
    isLocal?: boolean;
};
export function createPlayer(world: World, initData: PlayerInitialData): EntityRef {
    const id = world.entities.getId();
    const ref = new EntityRef(world, id);
    world.addComponent(id, AttractorObject, (o) => {
        o.mass = 20;
        return o;
    });
    world.addComponent(id, CircleCollider, (o) => {
        o.radius = 20;
        return o;
    })
    world.addComponent(id, PlayerTag);
    world.addComponent(id, Position, (obj) => {
        obj.x = initData.position.x;
        obj.y = initData.position.y;
    });
    world.addComponent(id, Velocity, (obj) => {
        obj.vx = initData.velocity?.vx ?? 0;
        obj.vy = initData.velocity?.vy ?? 0;
    });

    if (initData.networkId !== undefined) {
        const nId = initData.networkId;
        world.addComponent(id, NetworkEntity, (obj) => {
            obj.setNetworkId(nId);
        })
    }

    if (initData.renderable) {
        world.addComponent(id, Renderable, (obj) => {
            obj.layer = initData.renderable!.layer;
            obj.spriteId = initData.renderable!.spriteId;
        });
    }

    return ref;
};