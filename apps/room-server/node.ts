import { World } from "@/packages/engine/core/ecs/world";
import { createServerSideWorld } from "@/packages/game/create-world";
import { MotionUpdate, MovementDirectionChange, PositionChange, ServerMessage } from "@/packages/game/network/generated/server";
import { EntityID } from "@/packages/engine/core/ecs/entity";
import { NodeLoop } from "@/packages/game/node-game";
import { GameServer } from "./transport/game-server";

type UpdEntry = {
    pos?: PositionChange;
    mov?: MovementDirectionChange;
};

export class EntryPoint {
    private loop: NodeLoop;
    private world: World;
    private updates: Map<EntityID, UpdEntry>;
    private server_ = new GameServer();

    constructor() {
        this.updates = new Map();
        this.world = createServerSideWorld();
        this.world.systems.build();
        this.loop = new NodeLoop(this.world, this.onWorldUpdate.bind(this));

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