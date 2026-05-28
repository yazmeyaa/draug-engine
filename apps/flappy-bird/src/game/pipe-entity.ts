import type { World, EntityID } from "@draug/engine";
import type { PipeSpawnerResource } from "../resources/pipe-spawner";

export function removePipeEntity(world: World, pipeId: EntityID): void {
    world.destroyEntity(pipeId);
}

export function clearAllPipes(world: World, pipeSpawner: PipeSpawnerResource): void {
    for (const pipeId of pipeSpawner.pipeEntities) {
        world.destroyEntity(pipeId);
    }
    pipeSpawner.pipeEntities.length = 0;
}
