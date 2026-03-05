import { Server, WebSocket, RawData, ServerOptions, Data } from 'ws'

type BaseClientContext<UserData = unknown> = {
    socket: ClientSocket<UserData>;
    userData: UserData;
};

export type ClientConnectContext<UserData> = BaseClientContext<UserData> & {};
export type ClientMessageContext<UserData> = BaseClientContext<UserData> & {
    isBinary: boolean;
    message: RawData;
};
export type ClientDisconnectContext<UserData> = BaseClientContext<UserData> & {
    code: number;
    reason: Buffer<ArrayBufferLike>;
};

export type WebsocketServerConstructorOptions<UserData = unknown> = {
    websocket?: ServerOptions,
    hearthBeatInterval?: number;
    hearthBeatTimeout?: number;
    onClientConnect?: (ctx: ClientConnectContext<UserData>) => void;
    onClientMessage?: (ctx: ClientMessageContext<UserData>) => void;
    onClientDisconnect?: (ctx: ClientDisconnectContext<UserData>) => void;
    getUserData?: (ws: WebSocket) => UserData;
};

export class ClientSocket<UserData = unknown> {
    public isAlive: boolean = true;
    public readonly ws: WebSocket;
    public userData: UserData;
    constructor(ws: WebSocket, userData: UserData) {
        this.ws = ws;
        this.userData = userData;
    }
}

export class WebsocketServer<UserData = unknown> {
    private wss: Server;
    private clients: Set<ClientSocket> = new Set();
    private opts: WebsocketServerConstructorOptions<UserData>;

    constructor(opts?: WebsocketServerConstructorOptions<UserData>) {
        this.opts = opts ?? {};
        this.wss = new Server({ ...opts?.websocket });

        this.setupListeners();
        this.setupHeartbeat(opts?.hearthBeatInterval);
    }

    private setupListeners() {
        this.wss.on('connection', (ws) => {
            this.onClientConnect(ws);
        });
    }

    private setupHeartbeat(interval_: number = 30_000) {
        const interval = setInterval(() => {
            this.clients.forEach((socket) => {
                if (!socket.isAlive) {
                    return socket.ws.terminate();
                }
                socket.isAlive = false;
                socket.ws.ping();
            });
        }, interval_);

        this.wss.on('close', () => clearInterval(interval));
    }

    private onClientConnect(ws: WebSocket): void {
        const userData = this.opts.getUserData?.(ws) ?? {} as UserData;
        const socket = new ClientSocket(ws, userData);
        this.clients.add(socket);
        const baseCtx: BaseClientContext<UserData> = {
            socket: socket,
            userData: userData
        };

        this.opts.onClientConnect?.(baseCtx);

        ws.on('message', (message, isBinary) => {
            const ctx = { socket, userData, isBinary, message } satisfies ClientMessageContext<UserData>;
            this.opts.onClientMessage?.(ctx);
        })

        ws.on('close', (code, reason) => {
            this.clients.delete(socket);
            const ctx = { socket, userData, code, reason } satisfies ClientDisconnectContext<UserData>;
            this.opts.onClientDisconnect?.(ctx);
        })

        ws.on('error', (err) => {
            console.error('Socket error:', err.message);
            this.clients.delete(socket);
        });

        ws.on('pong', () => {
            socket.isAlive = true;
        })
    }


    public broadcast(message: Data, onError?: (error: Error) => void): void {
        for (const c of this.clients) {
            if (c.ws.readyState !== WebSocket.OPEN)
                continue;
            c.ws.send(message, (err) => {
                if (err) {
                    onError?.(err);
                }
            });
        }
    }
};