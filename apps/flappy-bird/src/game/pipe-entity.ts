import type { World, EntityID } from "@draug/engine";
import type { PipeSpawnerResource } from "../resources/pipe-spawner";

export function removePipeEntity(world: World, pipeId: EntityID): void {
    world.commands.destroyEntity(pipeId);
}

export function clearAllPipes(world: World, pipeSpawner: PipeSpawnerResource): void {
    for (const pipeId of pipeSpawner.pipeEntities) {
        world.commands.destroyEntity(pipeId);
    }
    pipeSpawner.pipeEntities.length = 0;
}
