import { createPlayer } from "@draug/game/archetypes/players";
import { createServerSideWorld } from "@draug/game/create-world";
import { PositionChange, MovementDirectionChange, MotionUpdate, ServerMessage } from "@draug/game/network/generated/server";
import { GameServer } from "./transport/game-server";
import { GameUserData } from "./types";
import { NodeLoop } from "./loop";
import { Transform } from "@draug/game/components/render/transform";
import { PlayerTag } from "@draug/game/components/tags/player-tag";
import type { World, EntityID } from "@draug/engine";

type UpdEntry = {
    pos?: PositionChange;
    mov?: MovementDirectionChange;
};

export class EntryPoint {
    private loop: NodeLoop;
    private world: World;
    private updates: Map<EntityID, UpdEntry>;
    private server_: GameServer;

    constructor() {
        this.updates = new Map();
        this.world = createServerSideWorld();
        this.world.systems.build();
        this.loop = new NodeLoop(this.world, this.onWorldUpdate.bind(this));

        this.server_ = new GameServer({
            getUserData: () => {
                const entity = createPlayer(this.world, { transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, baseSpeed: { speed: 120 } });
                console.log(entity)
                return new GameUserData(entity);
            },
        });

        this.server_.on('clientInputUpdate', (ctx, data) => {
            const { playerEntityID } = ctx.userData;
            this.updates.set(playerEntityID, {
                mov: {
                    dx: data.clientMovementDirection?.dx ?? 0,
                    dy: data.clientMovementDirection?.dy ?? 0,
                    entityId: playerEntityID,
                }
            });
        })


        this.server_.on('connected', (ctx) => {


            const entities = this.world.query({ include: [PlayerTag, Transform] });
            const players = entities.map((e) => {
                const ref = this.world.getEntityRef(e);
                const [position] = ref.with(Transform);
                return { position, entityID: ref.id };
            })
            console.log(players);
        })
    }

    public start(): void {
        this.server_.start();
        this.loop.start();
    }

    private onWorldUpdate() {
        if (this.updates.size === 0) {
            return;
        }
        const motionUpdates = MotionUpdate.create({})
        this.updates.forEach(u => {
            if (u.mov) {
                motionUpdates.movementDirectionChange.push(u.mov);
            }
        })
        const upd = ServerMessage.create({
            payload: {
                $case: 'motionUpdates',
                motionUpdates,
            }
        })

        const buf = ServerMessage.encode(upd).finish();
        this.server_.broadcast(Buffer.from(buf), console.error);
        this.updates.clear();
    }
}


const game = new EntryPoint();
game.start();
