import { ClientMessage } from "@/packages/game/network/generated/client";
import { CaseName, CasePayload, ClientPayload, MessageHandler } from "@/packages/game/network/message-handler";
import { Data } from "ws";
import { ClientMessageContext, WebsocketServer } from "./websocket-server";
import { GameUserData } from "../types";
import { ProtoMessageRouter } from "./proto-router";

export class GameServer {
    private handler =
        new MessageHandler<ClientPayload, ClientMessageContext<GameUserData>>();
    private wss: WebsocketServer<GameUserData>;

    private router =
        new ProtoMessageRouter(ClientMessage, this.handler);

    constructor() {
        this.wss = new WebsocketServer<GameUserData>({
            websocket: { port: 8090 },
            onClientMessage: (ctx) => {
                this.router.handle(ctx.message, ctx);
            }
        });
    }

    public on<K extends CaseName<ClientPayload>>(
        action: K,
        cb: (
            ctx: ClientMessageContext<GameUserData>,
            data: CasePayload<ClientPayload, K>
        ) => void
    ) {
        this.handler.on(action, (data, ctx) => cb(ctx, data));
    }

    public start(): void {
        this.wss.start();
    }
    public stop(): void {
        this.wss.stop();
    }

    public broadcast(msg: Data, onError?: (error: Error) => void): void {
        this.wss.broadcast(msg, onError);
    }
}
