import type { World } from "@draug/engine";
import { Position } from "@draug/engine/std-components";
import { ColliderRectangle } from "../components/collider";
import { FlappyTag } from "../components/flappy-tag";
import { PipeTag } from "../components/pipe-tag";
import { getColliderBox } from "../physics/collider-box";
import { worldToScreen } from "./camera-transform";
import type { Camera } from "./types";

export function drawHitboxes(
    ctx: CanvasRenderingContext2D,
    world: World,
    camera: Camera,
): void {
    const positionStore = world.components.getStorage(Position);
    const colliderStore = world.components.getStorage(ColliderRectangle);
    const birdStore = world.components.getStorage(FlappyTag);
    const pipeStore = world.components.getStorage(PipeTag);

    const entities = world.query({ include: [Position, ColliderRectangle] });

    ctx.save();
    ctx.lineWidth = 2;

    for (const entityId of entities) {
        const box = getColliderBox(
            positionStore.tryGet(entityId),
            colliderStore.tryGet(entityId),
        );

        const topLeft = worldToScreen(camera, box.left, box.top);
        const bottomRight = worldToScreen(camera, box.right, box.bottom);

        const w = bottomRight.x - topLeft.x;
        const h = bottomRight.y - topLeft.y;

        if (birdStore.has(entityId)) {
            ctx.strokeStyle = "#facc15";
            ctx.fillStyle = "rgba(250, 204, 21, 0.12)";
        } else if (pipeStore.has(entityId)) {
            ctx.strokeStyle = "#f87171";
            ctx.fillStyle = "rgba(248, 113, 113, 0.1)";
        } else {
            ctx.strokeStyle = "#94a3b8";
            ctx.fillStyle = "rgba(148, 163, 184, 0.1)";
        }

        ctx.fillRect(topLeft.x, topLeft.y, w, h);
        ctx.strokeRect(topLeft.x, topLeft.y, w, h);
    }

    ctx.restore();
}
