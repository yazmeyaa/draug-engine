import { EntityRef } from "@amber-game/engine/ecs/entity";
import { World } from "@amber-game/engine/ecs/world";
import { NetworkEntity } from "../components/network-entity";
import { PlayerTag } from "../components/player-tag";
import { Transform } from "../components/transform";
import { Renderable } from "../components/renderable";
import { Velocity } from "../components/velocity";
import { CircleCollider } from "../components/circle-collider";
import { EntityDebug } from "../components/entity-debug";


export type PlayerInitialData = {
    transform: Transform;
    velocity?: Velocity;
    renderable?: Renderable;
    networkId?: number;
    isLocal?: boolean;
};
export function createPlayer(world: World, initData: PlayerInitialData): EntityRef {
    const id = world.entities.getId();
    const ref = new EntityRef(world, id);
    world.addComponent(id, CircleCollider, (o) => {
        o.radius = 20;
        return o;
    })
    world.addComponent(id, PlayerTag);
    world.addComponent(id, Transform, (obj) => {
        obj.x = initData.transform.x;
        obj.y = initData.transform.y;
    });
    world.addComponent(id, Velocity, (obj) => {
        obj.vx = initData.velocity?.vx ?? 0;
        obj.vy = initData.velocity?.vy ?? 0;
    });

    world.addComponent(id, EntityDebug, (obj) => {
        obj.name = "Player"
    })

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