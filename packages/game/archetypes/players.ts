import { EntityRef } from "@/packages/engine/core/ecs/entity";
import { World } from "@/packages/engine/core/ecs/world";
import { PlayerTag } from "@/packages/game/components/player-tag";
import { Position } from "@/packages/game/components/position";
import { NetworkEntity } from "@/packages/game/components/network-entity";
import { Velocity } from "@/packages/game/components/velocity";
import { Renderable } from "@/packages/game/components/renderable";

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