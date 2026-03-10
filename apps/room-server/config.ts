import { MovementDirectionChange, PositionChange } from "@/packages/game/network/generated/server";
import { WebsocketServerConstructorOptions } from "./server";
import { GameUserData } from "./types";
import { EntityID } from "@/packages/engine/core/ecs/entity";
import { RawData } from "ws";
import { ClientMessage, MessageFns } from "@/packages/game/network/generated/client";

export type UpdEntry = {
    pos?: PositionChange;
    mov?: MovementDirectionChange;
};

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


export function createWssOptions(updates: Map<EntityID, UpdEntry>): WebsocketServerConstructorOptions<GameUserData> {
    return {
        getUserData() {
            return new GameUserData(Math.floor(Math.random() * 10_000));
        },
        onClientDisconnect(ctx) {
            const { playerEntityID } = ctx.userData
            console.log(`Player disconnected! ${ctx.reason.toString()}`)
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
    };
}
