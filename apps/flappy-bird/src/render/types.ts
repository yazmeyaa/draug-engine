import { type AssetID } from '@draug/engine'

export type RenderingSnapshotEntry = {
    entityId: number;
    x: number;
    y: number;
    spriteId: AssetID;
    zIndex: number;
};
export type RenderingSnapshot = RenderingSnapshotEntry[];
export class Camera {
    constructor(
        public x: number,
        public y: number,
        public zoom: number,
        public width: number,
        public height: number,
    ) { }
};