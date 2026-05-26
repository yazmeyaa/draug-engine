import type { Camera } from "./types";

export function worldToScreen(
    camera: Camera,
    worldX: number,
    worldY: number,
): { x: number; y: number } {
    return {
        x: (worldX - camera.x) * camera.zoom + camera.width / 2,
        y: (worldY - camera.y) * camera.zoom + camera.height / 2,
    };
}

export function worldSizeToScreen(camera: Camera, worldSize: number): number {
    return worldSize * camera.zoom;
}
