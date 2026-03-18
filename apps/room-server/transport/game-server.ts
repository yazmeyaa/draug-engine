import { CaseName, CasePayload, ClientPayload, MessageHandler } from '@amber-game/game/network/message-handler'
import { Data } from "ws";
import { ClientConnectContext, ClientDisconnectContext, ClientMessageContext, WebsocketServer, WebsocketServerConstructorOptions } from "./websocket-server";
import { GameUserData } from "../types";
import { ClientMessage } from "@amber-game/game/network/generated/client";
import { ProtoMessageRouter } from "@amber-game/game/network/proto-router";

/**
 * Internal events of the game server.
 * Used to track client connections and disconnections.
 *
 * @typedef {Object} InternalEvents
 * @property {"connected"} $case - Event triggered when a new client connects
 * @property {"disconnected"} $case - Event triggered when a client disconnects
 */
type InternalEvents =
    | { $case: "connected" }
    | { $case: "disconnected" };

/**
 * Context of a game server event.
 * Unions all possible context types that can be passed to event handlers.
 *
 * Can be one of:
 * - `ClientConnectContext` - contains socket info and user data when a client connects
 * - `ClientMessageContext` - contains message data and metadata when data is received
 * - `ClientDisconnectContext` - contains disconnect code and reason when a client disconnects
 *
 * @template UserData - Type of user-specific data (e.g., player entity ID)
 */
type GameContext<UserData> =
    | ClientConnectContext<UserData>
    | ClientMessageContext<UserData>
    | ClientDisconnectContext<UserData>;

/**
 * Union type of all possible messages in the game server.
 * Includes both client messages (decoded from protobuf) and internal server events (connect/disconnect).
 */
type GameMessage = ClientPayload | InternalEvents;

/**
 * Game server - main class for managing client connections and processing their messages.
 *
 * Provides:
 * - WebSocket connection management with clients
 * - Routing of incoming protobuf messages to registered handlers
 * - Handling of connection, message, and disconnection events
 * - Broadcasting messages to all connected clients
 *
 * Usage example:
 * ```typescript
 * const server = new GameServer({
 *   onClientConnect: (ctx) => console.log('Client connected'),
 *   onClientDisconnect: (ctx) => console.log('Client disconnected')
 * });
 *
 * server.on('playerMove', (ctx, data) => {
 *   console.log('Player moved:', data);
 * });
 *
 * server.start();
 * ```
 */
export class GameServer {
    /**
     * Message handler - routes events to registered listener functions.
     * Stores a map of handlers for each event type.
     * @private
     */
    private handler =
        new MessageHandler<GameMessage, GameContext<GameUserData>>();

    /**
     * WebSocket server - manages all client connections.
     * Responsible for opening/closing connections and sending messages.
     * @private
     */
    private wss: WebsocketServer<GameUserData>;

    /**
     * Protobuf message router - decodes incoming binary data
     * into typed messages and passes them to the handler.
     * @private
     */
    private router =
        new ProtoMessageRouter(ClientMessage, this.handler);

    /**
     * Creates a new game server instance.
     *
     * @param {Partial<WebsocketServerConstructorOptions<GameUserData>>} [serverOpts] - Server configuration options:
     *   - `websocket` - ws.Server options (port, SSL, etc.)
     *   - `hearthBeatInterval` - connection keepalive check interval in milliseconds
     *   - `onClientConnect` - callback function invoked when a client connects
     *   - `onClientDisconnect` - callback function invoked when a client disconnects
     *   - `getUserData` - function to create user data from a WebSocket socket
     */
    constructor(serverOpts?: Partial<WebsocketServerConstructorOptions<GameUserData>>) {
        this.wss = new WebsocketServer<GameUserData>({
            websocket: { port: 8090 },
            onClientConnect: (ctx) => {
                serverOpts?.onClientConnect?.(ctx);
                this.handler.emit({ $case: "connected" }, ctx);
            },
            onClientMessage: (ctx) => {
                serverOpts?.onClientMessage?.(ctx);
                this.router.handle(ctx.message, ctx);
            },
            onClientDisconnect: (ctx) => {
                serverOpts?.onClientDisconnect?.(ctx);
                this.handler.emit({ $case: "disconnected" }, ctx);
            },
            getUserData: (ws) => {
                return serverOpts?.getUserData?.(ws) ?? {} as GameUserData;
            },
        });
    }

    /**
     * Registers a handler for a specific event/message type.
     *
     * Allows subscribing to events in a type-safe manner.
     * The handler will be invoked each time an event with the specified $case occurs.
     *
     * @template K - The event key (type of $case, e.g. "connected", "disconnected", or message type)
     *
     * @param {K} action - The event type to subscribe to
     * @param {Function} cb - Handler function that will be called with event context and data:
     *   - `ctx` - event context (contains client socket, user data, etc.)
     *   - `data` - event payload (depends on the event type)
     *
     * @example
     * ```typescript
     * // Subscribe to internal connection event
     * server.on('connected', (ctx, data) => {
     *   console.log('Client connected with ID:', ctx.userData.playerEntityID);
     * });
     *
     * // Subscribe to a client message
     * server.on('playerMove', (ctx, moveData) => {
     *   console.log('Player moved:', moveData.x, moveData.y);
     * });
     * ```
     */
    public on<K extends CaseName<GameMessage>>(
        action: K,
        cb: (
            ctx: GameContext<GameUserData>,
            data: CasePayload<GameMessage, K>
        ) => void
    ) {
        this.handler.on(action, (data, ctx) => cb(ctx, data));
    }

    /**
     * Starts the game server - begins listening for incoming WebSocket connections on port 8090.
     * Must be called before using the server.
     *
     * @example
     * ```typescript
     * server.start();
     * console.log('Server started on port 8090');
     * ```
     */
    public start(): void {
        this.wss.start();
    }

    /**
     * Stops the game server - closes all client connections,
     * stops listening for new connections, and frees up resources.
     *
     * @example
     * ```typescript
     * server.stop();
     * console.log('Server stopped');
     * ```
     */
    public stop(): void {
        this.wss.stop();
    }

    /**
     * Sends a message to all connected clients (broadcast).
     * Useful for distributing game state updates to all players.
     *
     * @param {Data} msg - Binary message data (typically encoded protobuf)
     * @param {Function} [onError] - Optional error handler that will be invoked for each client
     *   if the send operation fails
     *
     * @example
     * ```typescript
     * // Send position update to all players
     * const encodedMessage = ServerMessage.encode({ ... }).finish();
     * server.broadcast(encodedMessage, (error) => {
     *   console.error('Failed to send message:', error);
     * });
     * ```
     */
    public broadcast(msg: Data, onError?: (error: Error) => void): void {
        this.wss.broadcast(msg, onError);
    }
}
