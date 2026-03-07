import { World } from "@/packages/engine/core/ecs/world";
import { Clock } from "@/packages/engine/runtime/clock";
import { GameLoop } from "@/packages/engine/runtime/game-loop";
import { ClientMessage, MessageFns } from "@/packages/game/network/generated/client";
import { RawData } from "ws";
import { WebsocketServer } from "./server";
import { createServerSideWorld } from "@/packages/game/create-world";
import { MotionUpdate, MovementDirectionChange, PositionChange, ServerMessage } from "@/packages/game/network/generated/server";

export class NodeGame {
    constructor(private world: World, private onWorldUpdate?: (world: World) => void) { }

    start() {
        const clock = new Clock();
        const loop = new GameLoop(clock, (dt) => {
            this.world.update(dt);
            this.onWorldUpdate?.(this.world);
        });
        loop.start((cb) => globalThis.setTimeout(cb, 16));
    }
}

const world = createServerSideWorld()

function decodeWsMessage<T extends object>(data: RawData, decoder: MessageFns<T>): T {
    if (Array.isArray(data)) {
        const buffer = Buffer.concat(data);
        return decoder.decode(buffer);
    }

    if (data instanceof ArrayBuffer) {
        return decoder.decode(new Uint8Array(data));
    }

    return decoder.decode(data);

}

class GameUserData {
    constructor(
        public readonly playerEntityID: number,
    ) { };
}

type UpdEntry = {
    pos?: PositionChange;
    mov?: MovementDirectionChange;
};
const updates: Map<EntityID, UpdEntry> = new Map();

const wss = new WebsocketServer<GameUserData>({
    getUserData() {
        return new GameUserData(Math.floor(Math.random() * 10_000));
    },
    onClientDisconnect(ctx) {
        const {playerEntityID} = ctx.userData
        updates.delete(playerEntityID);
    },
    onClientMessage: (ctx) => {
        const { message } = ctx;
        const msg = decodeWsMessage(message, ClientMessage);
        switch (msg.payload?.$case) {
            case 'clientInputUpdate':
                const { clientMovementDirection, clientChangeColor } = msg.payload.clientInputUpdate;
                if (clientMovementDirection !== undefined) {
                    const { dx, dy } = clientMovementDirection;
                    const { playerEntityID: entityId } = ctx.userData;
                    console.log(`Client changed direction! etityID=${entityId} dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)}.`);
                    if (!updates.has(entityId)) {
                        updates.set(entityId, {});
                    }
                    const update = updates.get(entityId)!
                    update.mov = { entityId, dx, dy }
                }

                if (clientChangeColor !== undefined) {
                    const { r, g, b } = clientChangeColor;
                    const { playerEntityID } = ctx.userData;
                    console.log(`Client changed own color! etityID=${playerEntityID} r=${r.toFixed(2)}, g=${g.toFixed(2)} b=${b.toFixed(2)}.`);
                }
        }
    },
    websocket: { port: 8090 }
})
type EntityID = number;
const game = new NodeGame(world, (w) => {
    const motionUpdates = MotionUpdate.create({})
    updates.forEach(u => {
        if(u.mov) {
            motionUpdates.movementDirectionChange.push(u.mov);
        }
    })
    const upd = ServerMessage.create({payload: {
        $case: 'motionUpdates',
        motionUpdates: motionUpdates,
    }})


    const buf = ServerMessage.encode(upd).finish();
    wss.broadcast(Buffer.from(buf), console.error)
    updates.clear();
})
world.systems.build();
game.start();
