import { Position } from "@draug/engine/std-components";
import { ColliderRectangle } from "../components/collider";
import { FlappyTag } from "../components/flappy-tag";
import { PipeTag } from "../components/pipe-tag";
import { COLLISION_EVENT_KEY, type CollisionEvent } from "../events/collision";
import { GameStateResource, GameState } from "../resources/game-state";
import {
    getColliderBox,
    intersectsAABB,
    unionAABB,
    type ColliderBox,
} from "../physics/collider-box";
import { getCameraWorldBounds } from "../render/camera-bounds";
import { Camera } from "../render/types";
import {
    System,
    SystemBase,
    type EventBuffer,
    type ComponentStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";
import { MovementSystem } from "@draug/engine/std-systems";

const BIRD_BOUND_MARGIN = 32;

@System({
    name: "CollisionSystem",
    query: {
        include: [FlappyTag, Position, ColliderRectangle],
    },
    computeAfter: [MovementSystem],
})
export class CollisionSystem extends SystemBase {
    private colliderStore!: ComponentStorage<ColliderRectangle>;
    private transformStore!: ComponentStorage<Position>;
    private collisionEvents!: EventBuffer<CollisionEvent>;
    private gameState!: GameStateResource;
    private camera!: Camera;
    private birdPrevBox: ColliderBox | null = null;

    public override onInit({ world }: SystemInitContext): void {
        this.colliderStore = world.components.getStorage(ColliderRectangle);
        this.transformStore = world.components.getStorage(Position);
        this.collisionEvents = world.events.getBuffer(COLLISION_EVENT_KEY);
        this.gameState = world.resources.get(GameStateResource);
        this.camera = world.resources.get(Camera);
    }

    public compute(ctx: SystemComputeContext): void {
        if (this.gameState.state !== GameState.Playing) {
            this.birdPrevBox = null;
            return;
        }

        const { world, entities } = ctx;
        if (entities.length === 0) {
            return;
        }

        const birdId = entities[0]!;
        const currBox = getColliderBox(
            this.transformStore.tryGet(birdId),
            this.colliderStore.tryGet(birdId),
        );

        if (this.isBirdOutOfBounds(currBox)) {
            this.gameState.state = GameState.GameOver;
            this.birdPrevBox = null;
            ctx.logger.info(() => `Collision (out of bounds): bird entity ${birdId}`);
            return;
        }

        const testBox =
            this.birdPrevBox !== null
                ? unionAABB(this.birdPrevBox, currBox)
                : currBox;

        const pipeIds = world.query({ include: [PipeTag, Position, ColliderRectangle] });
        for (const pipeId of pipeIds) {
            const pipeBox = getColliderBox(
                this.transformStore.tryGet(pipeId),
                this.colliderStore.tryGet(pipeId),
            );

            if (!intersectsAABB(testBox, pipeBox)) {
                continue;
            }

            this.gameState.state = GameState.GameOver;
            this.birdPrevBox = null;
            ctx.logger.info(() => `Collision: bird entity ${birdId}, pipe entity ${pipeId}`);
            this.collisionEvents.write({
                objA: {
                    colliderId: birdId,
                    position: { x: currBox.left, y: currBox.top },
                },
                objB: {
                    colliderId: pipeId,
                    position: { x: pipeBox.left, y: pipeBox.top },
                },
            });
            return;
        }

        this.birdPrevBox = currBox;
    }

    private isBirdOutOfBounds(box: Readonly<ColliderBox>): boolean {
        const { top, bottom } = getCameraWorldBounds(this.camera);
        const topBound = top + BIRD_BOUND_MARGIN;
        const bottomBound = bottom - BIRD_BOUND_MARGIN;
        return box.top < topBound || box.bottom > bottomBound;
    }
}
