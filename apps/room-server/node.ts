import { World } from "@/packages/engine/core/ecs/world";
import { WebsocketServer } from "./server";
import { createServerSideWorld } from "@/packages/game/create-world";
import { MotionUpdate, ServerMessage } from "@/packages/game/network/generated/server";
import { GameUserData } from "./types";
import { createWssOptions, UpdEntry } from "./config";
import { EntityID } from "@/packages/engine/core/ecs/entity";
import { NodeLoop } from "@/packages/game/node-game";

export class EntryPoint {
    private loop: NodeLoop;
    private world: World;
    private updates: Map<EntityID, UpdEntry>;
    private server: WebsocketServer<GameUserData>;

    constructor() {
        this.updates = new Map();
        this.world = createServerSideWorld();
        this.world.systems.build();
        this.server = new WebsocketServer<GameUserData>(createWssOptions(this.updates));
        this.loop = new NodeLoop(this.world, this.onWorldUpdate.bind(this));
    }

    public start(): void {
        this.loop.start();
    }

    private onWorldUpdate(w: World) {
        const motionUpdates = MotionUpdate.create({})
        this.updates.forEach(u => {
            if (u.mov) {
                motionUpdates.movementDirectionChange.push(u.mov);
            }
        })
        const upd = ServerMessage.create({
            payload: {
                $case: 'motidonUpdates',
                motidonUpdates: motionUpdates,
            }
        })


        const buf = ServerMessage.encode(upd).finish();
        this.server.broadcast(Buffer.from(buf), console.error)
        this.updates.clear();
    }
}


const game = new EntryPoint();
game.start();