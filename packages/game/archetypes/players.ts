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
import { entry, type CreateEntityComponentEntry } from "@amber-game/engine/ecs/command";


export type PlayerInitialData = {
    transform: Transform;
    velocity?: Velocity;
    renderable?: Renderable;
    networkId?: number;
    isLocal?: boolean;
    baseSpeed: BaseSpeed;
};
export function createPlayer(world: World, initData: PlayerInitialData): EntityRef {
    const entries: CreateEntityComponentEntry[] = [];

    entries.push(
        entry(PlayerTag),
        entry(Transform, obj => applyComponent(obj, initData.transform)),
        entry(CircleCollider, o => o.radius = 20),
        entry(Velocity, obj => applyComponent(obj, initData.velocity)),
        entry(BaseSpeed, obj => applyComponent(obj, initData.baseSpeed)),
        entry(EntityDebug, obj => {
            obj.name = "Player";
            if (initData.isLocal) {
                obj.name = `[LOCAL]: ${obj.name}`;
            }
        }),
        entry(Renderable, (obj) => applyComponent(obj, initData.renderable)),
    );


    if (initData.networkId !== undefined) {
        const nId = initData.networkId;
        entries.push(
            entry(NetworkEntity, (obj) => {
                obj.setNetworkId(nId);
            })
        )
    }

    const id = world.commands.createEntity(...entries)
    const ref = new EntityRef(world, id);
    return ref;
};