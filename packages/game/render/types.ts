import { type AssetID } from '@draug/engine'

export type RenderingSnapshotEntry = {
    entityId: number;
    x: number;
    y: number;
    spriteId: AssetID;
    zIndex: number;
};
export type RenderingSnapshot = RenderingSnapshotEntry[];
export type Camera = {
    x: number;
    y: number;
    zoom: number;
    width: number;
    height: number;
};