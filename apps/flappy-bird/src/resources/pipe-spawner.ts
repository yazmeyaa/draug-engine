import { Resource, type EntityID } from "@draug/engine";

export const PIPE_SEGMENT_SIZE = 64;

@Resource({ name: "PipeSpawnerResource" })
export class PipeSpawnerResource {
    constructor(
        public nextPipeX: number = 0,
        public pipeDistance: number = 320,
        public gapHeight: number = 170,
        public minGapCenter: number = -90,
        public maxGapCenter: number = 90,
        public lastPipeId: number = 0,
        /** World units beyond the right screen edge to pre-spawn columns. */
        public spawnAhead: number = 640,
        /** World units beyond the left screen edge before despawning. */
        public despawnBehind: number = 128,
        public readonly pipeEntities: EntityID[] = [],
    ) {}
}
