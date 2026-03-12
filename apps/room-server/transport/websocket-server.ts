import { Server, WebSocket, RawData, ServerOptions, Data } from "ws";

const MAX_BUFFER = 1 << 20; // ~1MB

type BaseClientContext<UserData = unknown> = {
    socket: ClientSocket<UserData>;
    userData: UserData;
};

export type ClientConnectContext<UserData> = BaseClientContext<UserData>;

export type ClientMessageContext<UserData> = BaseClientContext<UserData> & {
    isBinary: boolean;
    message: RawData;
};

export type ClientDisconnectContext<UserData> = BaseClientContext<UserData> & {
    code: number;
    reason: Buffer;
};

export type WebsocketServerConstructorOptions<UserData = unknown> = {
    websocket?: ServerOptions;
    hearthBeatInterval?: number;

    onClientConnect?: (ctx: ClientConnectContext<UserData>) => void;
    onClientMessage?: (ctx: ClientMessageContext<UserData>) => void;
    onClientDisconnect?: (ctx: ClientDisconnectContext<UserData>) => void;

    getUserData?: (ws: WebSocket) => UserData;
};

export class ClientSocket<UserData = unknown> {
    public heartbeatAlive = true;
    public readonly ws: WebSocket;
    // Internal index used by WebsocketServer swap-remove bookkeeping.
    public index: number = -1;
    public userData: UserData;

    constructor(ws: WebSocket, userData: UserData) {
        this.ws = ws;
        this.userData = userData;
    }

    public send(msg: Data, onError?: (error: Error) => void): void {
        if (this.ws.readyState !== WebSocket.OPEN) return;

        if (this.ws.bufferedAmount > MAX_BUFFER) {
            this.heartbeatAlive = false;
            this.ws.terminate();
            return;
        }

        this.ws.send(msg, (err) => {
            if (err && onError) onError(err);
        });
    }
}

export class WebsocketServer<UserData = unknown> {
    private wss: Server | null = null;
    private clients: ClientSocket<UserData>[] = [];
    private opts: WebsocketServerConstructorOptions<UserData>;
    private heartbeatTimer: NodeJS.Timeout | null = null;

    constructor(opts?: WebsocketServerConstructorOptions<UserData>) {
        this.opts = opts ?? {}
    }

    public start(): void {
        if (this.wss) return;
        this.wss = new Server({ ...this.opts.websocket })
        this.setupListeners()
        this.setupHeartbeat(this.opts.hearthBeatInterval ?? 30_000)
    };
    public stop() {
        if (!this.wss) return

        for (const c of this.clients) {
            c.ws.terminate()
        }

        this.clients = []

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer)
            this.heartbeatTimer = null;
        }

        this.wss.close()
        this.wss = null;
    }

    private setupListeners() {
        if (!this.wss) return;
        this.wss.on("connection", (ws) => {
            this.onClientConnect(ws);
        });
    }

    private removeClientAt(index: number): ClientSocket<UserData> | undefined {
        if (index < 0 || index >= this.clients.length) return undefined;

        const last = this.clients.length - 1;
        const removed = this.clients[index]!;

        if (index !== last) {
            const moved = this.clients[last]!;
            this.clients[index] = moved;
            moved.index = index;
        }

        this.clients.pop();
        removed.index = -1;
        return removed;
    }

    private setupHeartbeat(interval: number) {
        this.heartbeatTimer = setInterval(() => {
            for (let i = this.clients.length - 1; i >= 0; i--) {
                const socket = this.clients[i]!;

                if (!socket.heartbeatAlive) {
                    socket.heartbeatAlive = false;
                    socket.ws.terminate();
                    continue;
                }

                socket.heartbeatAlive = false;

                try {
                    socket.ws.ping();
                } catch {
                    socket.heartbeatAlive = false;
                    socket.ws.terminate();
                }
            }
        }, interval);

        if(this.wss) {
            this.wss.on("close", () => clearInterval(this.heartbeatTimer!));
        }
    }

    private onClientConnect(ws: WebSocket): void {
        const userData = this.opts.getUserData?.(ws) ?? ({} as UserData);
        const socket = new ClientSocket(ws, userData);

        this.clients.push(socket);
        socket.index = this.clients.length - 1;

        const baseCtx: BaseClientContext<UserData> = {
            socket,
            userData
        };

        this.opts.onClientConnect?.(baseCtx);

        ws.on("message", (message, isBinary) => {
            const ctx: ClientMessageContext<UserData> = {
                socket,
                userData,
                message,
                isBinary
            };

            this.opts.onClientMessage?.(ctx);
        });

        ws.on("close", (code, reason) => {
            this.removeClientAt(socket.index);

            const ctx: ClientDisconnectContext<UserData> = {
                socket,
                userData,
                code,
                reason
            };

            this.opts.onClientDisconnect?.(ctx);
        });

        ws.on("error", (err) => {
            console.error("Socket error:", err.message);
            ws.terminate();
        });

        ws.on("pong", () => {
            socket.heartbeatAlive = true;
        });
    }

    public broadcast(message: Data, onError?: (error: Error) => void): void {
        for (const client of this.clients) {
            client.send(message, onError);
        }
    }
}