import type { ResourceID } from "@amber-game/resources/resource";

export type RenderingSnapshotEntry = {
    entityId: number;
    x: number;
    y: number;
    spriteId: ResourceID;
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