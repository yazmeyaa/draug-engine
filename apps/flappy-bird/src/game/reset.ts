import type { World, EntityID } from "@draug/engine";
import { Position, Velocity } from "@draug/engine/std-components";
import { GameStateResource, GameState } from "../resources/game-state";
import { PipeSpawnerResource, PIPE_SEGMENT_SIZE } from "../resources/pipe-spawner";
import { CAMERA_AHEAD_OFFSET } from "../systems/bind-camera";
import { Camera } from "../render/types";
import { clearAllPipes } from "./pipe-entity";

export const BIRD_START = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
} as const;

export const BIRD_FORWARD_SPEED = 4;

export function resetBird(world: World, birdId: EntityID): void {
    const position = world.components.getStorage(Position);
    const velocity = world.components.getStorage(Velocity);

    position.tryGet(birdId).value.set(BIRD_START.x, BIRD_START.y, 0);
    velocity.tryGet(birdId).linear.set(BIRD_START.vx, BIRD_START.vy, 0);
}

export function getFirstPipeSpawnX(world: World, birdX: number): number {
    const camera = world.resources.get(Camera);
    const halfWidth = camera.width / (2 * camera.zoom);
    const right = birdX + CAMERA_AHEAD_OFFSET + halfWidth;
    return right + PIPE_SEGMENT_SIZE;
}

export function resetPipeSpawner(world: World): void {
    const pipeSpawner = world.resources.get(PipeSpawnerResource);
    pipeSpawner.nextPipeX = getFirstPipeSpawnX(world, BIRD_START.x);
}

export function resetRound(world: World): void {
    const gameState = world.resources.get(GameStateResource);
    const pipeSpawner = world.resources.get(PipeSpawnerResource);

    clearAllPipes(world, pipeSpawner);
    resetBird(world, gameState.birdId);
    resetPipeSpawner(world);

    gameState.state = GameState.Start;
    gameState.score = 0;
    gameState.scoredGapIds.clear();
}
