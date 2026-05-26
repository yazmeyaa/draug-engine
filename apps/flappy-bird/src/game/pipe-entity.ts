import type { World, EntityID } from "@draug/engine";
import { Position } from "@draug/engine/std-components";
import { ColliderRectangle } from "../components/collider";
import { PipeGapId } from "../components/pipe-gap-id";
import { PipeTag } from "../components/pipe-tag";
import { Renderable } from "../components/renderable";
import type { PipeSpawnerResource } from "../resources/pipe-spawner";

export function removePipeEntity(world: World, pipeId: EntityID): void {
    world.removeComponent(pipeId, Position);
    world.removeComponent(pipeId, ColliderRectangle);
    world.removeComponent(pipeId, Renderable);
    world.removeComponent(pipeId, PipeTag);
    world.removeComponent(pipeId, PipeGapId);
}

export function clearAllPipes(world: World, pipeSpawner: PipeSpawnerResource): void {
    for (const pipeId of pipeSpawner.pipeEntities) {
        removePipeEntity(world, pipeId);
    }
    pipeSpawner.pipeEntities.length = 0;
}
