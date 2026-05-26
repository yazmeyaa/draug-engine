import type { Camera } from "./types";

export type CameraWorldBounds = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};

export function getCameraWorldBounds(camera: Camera): CameraWorldBounds {
    const halfWidth = camera.width / (2 * camera.zoom);
    const halfHeight = camera.height / (2 * camera.zoom);
    return {
        left: camera.x - halfWidth,
        right: camera.x + halfWidth,
        top: camera.y - halfHeight,
        bottom: camera.y + halfHeight,
    };
}
