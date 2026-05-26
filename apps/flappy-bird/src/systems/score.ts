import { Position } from "@draug/engine/std-components";
import { FlappyTag } from "../components/flappy-tag";
import { PipeGapId } from "../components/pipe-gap-id";
import { PipeTag } from "../components/pipe-tag";
import { GameStateResource, GameState } from "../resources/game-state";
import { PIPE_SEGMENT_SIZE } from "../resources/pipe-spawner";
import {
    System,
    SystemBase,
    type ComponentStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";
import { MovementSystem } from "@draug/engine/std-systems";

@System({
    name: "ScoreSystem",
    query: {
        include: [FlappyTag, Position],
    },
    computeAfter: [MovementSystem],
})
export class ScoreSystem extends SystemBase {
    private positionStore!: ComponentStorage<Position>;
    private pipeGapStore!: ComponentStorage<PipeGapId>;
    private gameState!: GameStateResource;

    public onInit({ world }: SystemInitContext): void {
        this.positionStore = world.components.getStorage(Position);
        this.pipeGapStore = world.components.getStorage(PipeGapId);
        this.gameState = world.resources.get(GameStateResource);
    }

    public compute(ctx: SystemComputeContext): void {
        if (this.gameState.state !== GameState.Playing) {
            return;
        }

        for (const birdId of ctx.entities) {
            const birdX = this.positionStore.tryGet(birdId).value.x;

            for (const pipeId of ctx.world.query({ include: [PipeTag, Position, PipeGapId] })) {
                const gap = this.pipeGapStore.tryGet(pipeId);
                if (gap.isTopSegment || this.gameState.scoredGapIds.has(gap.gapId)) {
                    continue;
                }

                const pipeX = this.positionStore.tryGet(pipeId).value.x;
                const gapCenterX = pipeX + PIPE_SEGMENT_SIZE / 2;

                if (birdX >= gapCenterX) {
                    this.gameState.scoredGapIds.add(gap.gapId);
                    this.gameState.score += 1;
                    ctx.logger.info(
                        () =>
                            `Score +1 (gapId=${gap.gapId}, pipe entity ${pipeId}), total=${this.gameState.score}`,
                    );
                }
            }
        }
    }
}
