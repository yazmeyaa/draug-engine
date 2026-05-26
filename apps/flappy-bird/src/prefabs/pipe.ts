import { Position } from "@draug/engine/std-components";
import { ColliderRectangle } from "../components/collider";
import { PipeGapId } from "../components/pipe-gap-id";
import { Renderable } from "../components/renderable";
import { PipeTag } from "../components/pipe-tag";
import { PipeSpawnerResource, PIPE_SEGMENT_SIZE } from "../resources/pipe-spawner";
import { applyComponent } from "./shared";
import {
    entry,
    type World,
    type EntityID,
} from "@draug/engine";

export type CreatePipeParams = {
    x: number;
    gapTop: number;
    gapHeight: number;
    worldTop: number;
    worldBottom: number;
    renderable: Renderable;
    gapId: number;
};

function createPipeSegment(
    world: World,
    params: {
        x: number;
        y: number;
        renderable: Renderable;
        gapId: number;
        isTopSegment: boolean;
    },
): EntityID {
    return world.commands.createEntity(
        entry(Position, t => t.value.set(params.x, params.y, 0)),
        entry(ColliderRectangle, c => applyComponent(c, {
            width: PIPE_SEGMENT_SIZE,
            height: PIPE_SEGMENT_SIZE,
            offsetX: 0,
            offsetY: 0,
        })),
        entry(Renderable, r => applyComponent(r, params.renderable)),
        entry(PipeTag),
        entry(PipeGapId, g => {
            g.gapId = params.gapId;
            g.isTopSegment = params.isTopSegment;
        }),
    );
}

export function createPipe(world: World, params: CreatePipeParams): void {
    const pipeSpawner = world.resources.get(PipeSpawnerResource);
    const gapBottom = params.gapTop + params.gapHeight;
    const segmentIds: EntityID[] = [];

    // One extra segment past the visible edge hides grid gaps at screen borders.
    const spawnTop = params.worldTop - PIPE_SEGMENT_SIZE;
    const spawnBottom = params.worldBottom + PIPE_SEGMENT_SIZE;

    for (
        let y = params.gapTop - PIPE_SEGMENT_SIZE;
        y >= spawnTop;
        y -= PIPE_SEGMENT_SIZE
    ) {
        segmentIds.push(createPipeSegment(world, {
            x: params.x,
            y,
            renderable: params.renderable,
            gapId: params.gapId,
            isTopSegment: true,
        }));
    }

    for (
        let y = gapBottom;
        y + PIPE_SEGMENT_SIZE <= spawnBottom;
        y += PIPE_SEGMENT_SIZE
    ) {
        segmentIds.push(createPipeSegment(world, {
            x: params.x,
            y,
            renderable: params.renderable,
            gapId: params.gapId,
            isTopSegment: false,
        }));
    }

    world.commands.add(() => {
        pipeSpawner.pipeEntities.push(...segmentIds);
    });
}
