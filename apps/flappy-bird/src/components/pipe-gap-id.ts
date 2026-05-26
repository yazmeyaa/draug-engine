import { Component } from "@draug/engine";

@Component({ name: "PipeGapId" })
export class PipeGapId {
    constructor(
        public gapId: number,
        public isTopSegment: boolean,
    ) {}
}
