import { EntityRef } from "@amber-game/engine/ecs/entity";
import { World } from "@amber-game/engine/ecs/world";
import { NetworkEntity } from "../components/network-entity";
import { PlayerTag } from "../components/player-tag";
import { Transform } from "../components/transform";
import { Renderable } from "../components/renderable";
import { Velocity } from "../components/velocity";
import { CircleCollider } from "../components/circle-collider";
import { EntityDebug } from "../components/entity-debug";
import { applyComponent } from "./shared";


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
    world.addComponent(id, Transform, (obj) => applyComponent(obj, initData.transform));
    world.addComponent(id, Velocity, (obj) => applyComponent(obj, initData.velocity));
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