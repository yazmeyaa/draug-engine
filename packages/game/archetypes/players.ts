import { EntityRef } from "@amber-game/engine/ecs/entity";
import { World } from "@amber-game/engine/ecs/world";
import { NetworkEntity } from "../components/network/network-entity";
import { PlayerTag } from "../components/tags/player-tag";
import { Transform } from "../components/render/transform";
import { Renderable } from "../components/render/renderable";
import { Velocity } from "../components/physics/velocity";
import { CircleCollider } from "../components/collision/circle-collider";
import { EntityDebug } from "../components/debug/entity-debug";
import { applyComponent } from "./shared";
import { BaseSpeed } from "../components/gameplay/base-speed";


export type PlayerInitialData = {
    transform: Transform;
    velocity?: Velocity;
    renderable?: Renderable;
    networkId?: number;
    isLocal?: boolean;
    baseSpeed: BaseSpeed;
};
export function createPlayer(world: World, initData: PlayerInitialData): EntityRef {
    const id = world.entities.getId();
    const ref = new EntityRef(world, id);
    world.addComponent(id, CircleCollider, (o) => {
        o.radius = 20;
        return o;
    })
    world.addComponent(id, PlayerTag);
    world.addComponent(id, Transform, (obj) => applyComponent(obj, initData.transform));
    world.addComponent(id, Velocity, (obj) => applyComponent(obj, initData.velocity));
    world.addComponent(id, BaseSpeed, (obj) => applyComponent(obj, initData.baseSpeed));
    world.addComponent(id, EntityDebug, (obj) => {
        obj.name = "Player";
        if (initData.isLocal) {
            obj.name = `[LOCAL]: ${obj.name}`;
        }
    })
    world.addComponent(id, Renderable, (obj) => applyComponent(obj, initData.renderable));

    if (initData.networkId !== undefined) {
        const nId = initData.networkId;
        world.addComponent(id, NetworkEntity, (obj) => {
            obj.setNetworkId(nId);
        })
    }

    return ref;
};