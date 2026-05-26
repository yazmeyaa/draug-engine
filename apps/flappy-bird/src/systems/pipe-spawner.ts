import { Position } from "@draug/engine/std-components";
import { FlappyTag } from "../components/flappy-tag";
import { removePipeEntity } from "../game/pipe-entity";
import { GameStateResource, GameState } from "../resources/game-state";
import { getCameraWorldBounds } from "../render/camera-bounds";
import { Camera } from "../render/types";
import { PipeSpawnerResource, PIPE_SEGMENT_SIZE } from "../resources/pipe-spawner";
import { createPipe } from "../prefabs/pipe";
import {
    System,
    SystemBase,
    type AssetID,
    type ComponentStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";
import { MovementSystem } from "@draug/engine/std-systems";
import { BindCameraSystem } from "./bind-camera";

@System({
    name: "PipeSpawnerSystem",
    query: {
        include: [FlappyTag, Position],
    },
    computeAfter: [MovementSystem, BindCameraSystem],
})
export class PipeSpawnerSystem extends SystemBase {
    private gameState!: GameStateResource;
    private pipeSpawner!: PipeSpawnerResource;
    private positionStore!: ComponentStorage<Position>;
    private boxSpriteId!: AssetID;

    public onInit({ world }: SystemInitContext): void {
        this.gameState = world.resources.get(GameStateResource);
        this.pipeSpawner = world.resources.get(PipeSpawnerResource);
        this.positionStore = world.components.getStorage(Position);
    }

    public setSpriteId(spriteId: AssetID): void {
        this.boxSpriteId = spriteId;
    }

    public compute(ctx: SystemComputeContext): void {
        if (this.gameState.state !== GameState.Playing) {
            return;
        }

        const { world } = ctx;
        const camera = world.resources.get(Camera);
        const { left, right, top: worldTop, bottom: worldBottom } = getCameraWorldBounds(camera);

        const minSpawnX = right + PIPE_SEGMENT_SIZE;
        if (this.pipeSpawner.nextPipeX < minSpawnX) {
            this.pipeSpawner.nextPipeX = minSpawnX;
        }

        const spawnUntilX = right + this.pipeSpawner.spawnAhead;

        while (this.pipeSpawner.nextPipeX < spawnUntilX) {
            const gapCenter =
                Math.random() * (this.pipeSpawner.maxGapCenter - this.pipeSpawner.minGapCenter) +
                this.pipeSpawner.minGapCenter;
            const gapTop = gapCenter - this.pipeSpawner.gapHeight / 2;
            const gapBottom = gapTop + this.pipeSpawner.gapHeight;
            const gapId = this.pipeSpawner.lastPipeId;

            ctx.logger.info(
                () =>
                    `Pipe spawned at x=${this.pipeSpawner.nextPipeX.toFixed(2)}, gapId=${gapId}, ` +
                    `gap center y=${gapCenter.toFixed(1)}, top=${gapTop.toFixed(1)}, bottom=${gapBottom.toFixed(1)}`,
            );

            createPipe(world, {
                x: this.pipeSpawner.nextPipeX,
                gapTop,
                gapHeight: this.pipeSpawner.gapHeight,
                worldTop,
                worldBottom,
                renderable: {
                    spriteId: this.boxSpriteId,
                    layer: 0,
                },
                gapId,
            });
            this.pipeSpawner.lastPipeId++;

            this.pipeSpawner.nextPipeX += this.pipeSpawner.pipeDistance;
        }

        const despawnBeforeX = left - this.pipeSpawner.despawnBehind;
        for (let i = this.pipeSpawner.pipeEntities.length - 1; i >= 0; i--) {
            const pipeId = this.pipeSpawner.pipeEntities[i]!;
            if (!this.positionStore.has(pipeId)) {
                continue;
            }

            const pos = this.positionStore.tryGet(pipeId);
            if (pos.value.x + PIPE_SEGMENT_SIZE < despawnBeforeX) {
                removePipeEntity(world, pipeId);
                this.pipeSpawner.pipeEntities.splice(i, 1);
            }
        }
    }
}
