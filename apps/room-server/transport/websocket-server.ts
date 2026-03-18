import { WebSocket, type RawData, type ServerOptions, type Data, WebSocketServer } from "ws";

/**
 * Maximum buffer size before terminating a connection.
 * Prevents memory overflow from clients that can't keep up with message sending.
 * Set to approximately 1MB (1048576 bytes).
 */
const MAX_BUFFER = 1 << 20; // ~1MB

/**
 * Base context shared by all client connection states.
 * Contains the core information about a connected client.
 *
 * @template UserData - Type of application-specific user data attached to each client
 *
 * @property {ClientSocket<UserData>} socket - Reference to the client socket wrapper
 * @property {UserData} userData - Application-specific data for this client (e.g., user ID, permissions)
 */
type BaseClientContext<UserData = unknown> = {
    socket: ClientSocket<UserData>;
    userData: UserData;
};

/**
 * Context provided when a client successfully connects.
 * Extends the base context with connection-specific information.
 *
 * @template UserData - Type of user-specific data
 *
 * @example
 * ```typescript
 * type MyUserData = { playerId: number; username: string };
 * const ctx: ClientConnectContext<MyUserData> = {
 *   socket: clientSocket,
 *   userData: { playerId: 42, username: 'Player1' }
 * };
 * ```
 */
export type ClientConnectContext<UserData> = BaseClientContext<UserData>;

/**
 * Context provided when a client sends a message.
 * Extends the base context with message metadata and content.
 *
 * @template UserData - Type of user-specific data
 *
 * @property {boolean} isBinary - Whether the message is binary data (true) or text (false)
 * @property {RawData} message - The raw message data (Buffer, string, or ArrayBuffer)
 *
 * @example
 * ```typescript
 * server.on('message', (ctx: ClientMessageContext<MyUserData>) => {
 *   if (ctx.isBinary) {
 *     // Handle binary protobuf message
 *   } else {
 *     // Handle text message
 *   }
 * });
 * ```
 */
export type ClientMessageContext<UserData> = BaseClientContext<UserData> & {
    isBinary: boolean;
    message: RawData;
};

/**
 * Context provided when a client disconnects.
 * Extends the base context with disconnection details.
 *
 * @template UserData - Type of user-specific data
 *
 * @property {number} code - WebSocket close code (1000 = normal closure, 1001 = going away, etc.)
 * @property {Buffer} reason - Optional reason for disconnection as a Buffer
 *
 * @example
 * ```typescript
 * server.on('disconnect', (ctx: ClientDisconnectContext<MyUserData>) => {
 *   console.log(`Client disconnected with code ${ctx.code}: ${ctx.reason.toString()}`);
 * });
 * ```
 */
export type ClientDisconnectContext<UserData> = BaseClientContext<UserData> & {
    code: number;
    reason: Buffer;
};

/**
 * Configuration options for WebsocketServer initialization.
 * Allows customizing server behavior, timeouts, and providing callback handlers.
 *
 * @template UserData - Type of user-specific data
 *
 * @property {ServerOptions} [websocket] - Options passed directly to ws.Server (port, hostname, ssl, etc.)
 * @property {number} [hearthBeatInterval=30000] - Interval in milliseconds for sending ping frames to detect dead connections
 * @property {Function} [onClientConnect] - Callback invoked when a new client connects
 * @property {Function} [onClientMessage] - Callback invoked when a client sends a message
 * @property {Function} [onClientDisconnect] - Callback invoked when a client disconnects
 * @property {Function} [getUserData] - Function to initialize user data from a WebSocket connection
 *
 * @example
 * ```typescript
 * const options: WebsocketServerConstructorOptions<MyUserData> = {
 *   websocket: { port: 8080, host: 'localhost' },
 *   hearthBeatInterval: 30000,
 *   getUserData: (ws) => ({
 *     playerId: generateId(),
 *     username: extractUsernameFromQuery(ws.url)
 *   }),
 *   onClientConnect: (ctx) => console.log('Connected'),
 *   onClientMessage: (ctx) => console.log('Message received'),
 *   onClientDisconnect: (ctx) => console.log('Disconnected')
 * };
 * ```
 */
export type WebsocketServerConstructorOptions<UserData = unknown> = {
    websocket?: ServerOptions;
    hearthBeatInterval?: number;

    onClientConnect?: (ctx: ClientConnectContext<UserData>) => void;
    onClientMessage?: (ctx: ClientMessageContext<UserData>) => void;
    onClientDisconnect?: (ctx: ClientDisconnectContext<UserData>) => void;

    getUserData?: (ws: WebSocket) => UserData;
};

/**
 * ClientSocket - a wrapper around a WebSocket connection for a single client.
 *
 * Provides:
 * - Type-safe message sending with buffering checks
 * - Heartbeat state tracking for connection health monitoring
 * - Index tracking for efficient client list management
 * - User-specific data storage
 *
 * @template UserData - Type of application-specific data for this client
 *
 * @example
 * ```typescript
 * const socket = new ClientSocket<MyUserData>(wsConnection, userData);
 * socket.send(Buffer.from('Hello'), (err) => {
 *   if (err) console.error('Failed to send:', err);
 * });
 * ```
 */
export class ClientSocket<UserData = unknown> {
    /**
     * Whether this client is still alive according to the last heartbeat check.
     * Set to false when a ping is sent, set back to true when a pong is received.
     * Used to detect unresponsive connections.
     *
     * @type {boolean}
     */
    public heartbeatAlive = true;

    /**
     * The underlying WebSocket connection.
     * Read-only - direct manipulation should be avoided in favor of the send() method.
     *
     * @type {WebSocket}
     * @readonly
     */
    public readonly ws: WebSocket;

    /**
     * Internal index in the WebsocketServer's client array.
     * Used for efficient O(1) removal using swap-remove technique.
     * Set to -1 when the client is removed.
     *
     * @type {number}
     * @internal
     */
    public index: number = -1;

    /**
     * Application-specific data associated with this client.
     * Can store user ID, session info, game state, etc.
     *
     * @type {UserData}
     */
    public userData: UserData;

    /**
     * Creates a new client socket wrapper.
     *
     * @param {WebSocket} ws - The underlying WebSocket connection
     * @param {UserData} userData - Application-specific user data to associate with this client
     */
    constructor(ws: WebSocket, userData: UserData) {
        this.ws = ws;
        this.userData = userData;
    }

    /**
     * Sends a message to the client with safety checks.
     *
     * Performs the following checks:
     * - Verifies the WebSocket is in OPEN state
     * - Checks if the send buffer exceeds MAX_BUFFER threshold
     * - If buffer is full, terminates the connection to prevent memory issues
     * - Invokes optional error callback if send fails
     *
     * @param {Data} msg - The message to send (Buffer, string, or binary data)
     * @param {Function} [onError] - Optional callback if the send operation fails
     *
     * @example
     * ```typescript
     * socket.send(encodedMessage, (error) => {
     *   console.error('Send failed:', error.message);
     * });
     * ```
     */
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

/**
 * WebsocketServer - manages all WebSocket client connections for a multiplayer game.
 *
 * Key features:
 * - Connection lifecycle management (connect, message, disconnect events)
 * - Heartbeat/ping-pong monitoring to detect stale connections
 * - Efficient client tracking using swap-remove array technique
 * - Broadcasting messages to all connected clients
 * - Type-safe user data management
 *
 * The server automatically:
 * - Sends ping frames at regular intervals to check connection health
 * - Terminates connections that don't respond to pings
 * - Removes dead connections from the client list
 * - Prevents memory overflow by disconnecting clients with too much buffered data
 *
 * @template UserData - Type of application-specific data stored per client
 *
 * @example
 * ```typescript
 * type PlayerData = { playerId: number; username: string };
 *
 * const server = new WebsocketServer<PlayerData>({
 *   websocket: { port: 8080 },
 *   hearthBeatInterval: 30000,
 *   getUserData: (ws) => ({
 *     playerId: generateId(),
 *     username: extractUsername(ws.url)
 *   }),
 *   onClientConnect: (ctx) => {
 *     console.log('Player connected:', ctx.userData.username);
 *   },
 *   onClientMessage: (ctx) => {
 *     console.log('Message from', ctx.userData.username);
 *   },
 *   onClientDisconnect: (ctx) => {
 *     console.log('Player disconnected:', ctx.userData.username);
 *   }
 * });
 *
 * server.start();
 * ```
 */
export class WebsocketServer<UserData = unknown> {
    /**
     * The underlying ws.Server instance.
     * Null until start() is called, and set back to null when stop() is called.
     * @private
     */
    private wss: WebSocketServer | null = null;

    /**
     * Array of all connected clients.
     * Uses swap-remove technique for O(1) removal.
     * @private
     */
    private clients: ClientSocket<UserData>[] = [];

    /**
     * Configuration options for this server.
     * @private
     */
    private opts: WebsocketServerConstructorOptions<UserData>;

    /**
     * Handle to the heartbeat interval timer.
     * Null when the server is stopped.
     * @private
     */
    private heartbeatTimer: NodeJS.Timeout | null = null;

    /**
     * Creates a new WebSocket server instance.
     *
     * @param {WebsocketServerConstructorOptions<UserData>} [opts] - Configuration options
     */
    constructor(opts?: WebsocketServerConstructorOptions<UserData>) {
        this.opts = opts ?? {}
    }

    /**
     * Starts the WebSocket server.
     *
     * Sets up:
     * - The underlying ws.Server on the configured port
     * - Connection listeners
     * - Heartbeat monitoring
     *
     * If already started, this method does nothing.
     *
     * @example
     * ```typescript
     * server.start();
     * ```
     */
    public start(): void {
        if (this.wss) return;
        this.wss = new WebSocketServer({ ...this.opts.websocket })
        this.setupListeners()
        this.setupHeartbeat(this.opts.hearthBeatInterval ?? 30_000)
    }

    /**
     * Stops the WebSocket server.
     *
     * Cleans up:
     * - Terminates all client connections
     * - Clears the client list
     * - Cancels the heartbeat timer
     * - Closes the underlying ws.Server
     *
     * If not running, this method does nothing.
     *
     * @example
     * ```typescript
     * server.stop();
     * ```
     */
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

    /**
     * Sets up the WebSocket connection listener.
     * Called automatically by start().
     *
     * Listens for new WebSocket connections and calls onClientConnect handler.
     *
     * @private
     */
    private setupListeners() {
        if (!this.wss) return;
        this.wss.on("connection", (ws) => {
            this.onClientConnect(ws);
        });
    }

    /**
     * Removes a client from the client list using swap-remove technique.
     *
     * This is O(1) by swapping the last client into the removed client's position,
     * then popping the last element. Updates the moved client's index accordingly.
     *
     * @param {number} index - Index of the client to remove
     * @returns {ClientSocket<UserData> | undefined} The removed client, or undefined if index is invalid
     *
     * @private
     */
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

    /**
     * Sets up the heartbeat mechanism to detect dead connections.
     *
     * Periodically:
     * - Sends a ping frame to each connected client
     * - Marks clients as not alive (heartbeatAlive = false)
     * - On next interval, terminates clients that didn't respond with pong
     * - This effectively removes any unresponsive connections
     *
     * The heartbeat timer is automatically cleared when the server closes.
     *
     * @param {number} interval - Milliseconds between heartbeat checks
     *
     * @private
     */
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

    /**
     * Handles a new client connection.
     *
     * Performs the following:
     * - Creates ClientSocket wrapper with user data
     * - Adds to client list and stores index
     * - Calls onClientConnect callback
     * - Sets up message, close, error, and pong handlers
     * - Handles client disconnection and cleanup
     *
     * @param {WebSocket} ws - The new WebSocket connection
     *
     * @private
     */
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

    /**
     * Broadcasts a message to all connected clients.
     *
     * Sends the message to each client individually.
     * If a client's send fails, the optional error callback is invoked.
     * Does not guarantee delivery - relies on individual client send() methods.
     *
     * @param {Data} message - The message to broadcast (Buffer, string, or binary data)
     * @param {Function} [onError] - Optional callback invoked if any send fails
     *
     * @example
     * ```typescript
     * const encoded = ServerMessage.encode(stateUpdate).finish();
     * server.broadcast(encoded, (err) => {
     *   console.error('Broadcast failed for a client:', err);
     * });
     * ```
     */
    public broadcast(message: Data, onError?: (error: Error) => void): void {
        for (const client of this.clients) {
            client.send(message, onError);
        }
    }
}