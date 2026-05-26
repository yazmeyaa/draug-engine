import type { World } from "@draug/engine";
import type { Camera, RenderingSnapshot, RenderingSnapshotEntry } from "./types";
import { Renderable } from "../components/renderable";
import { Position } from "@draug/engine/std-components";

export class RenderView {
    constructor(
        private world: World,
        private camera_: Camera,
    ) { }

    public get camera(): Camera {
        return this.camera_;
    }

    public snapshot(): RenderingSnapshot {
        const camera = this.camera_;
        const world = this.world;

        const entities = world.query({ include: [Position, Renderable] });
        const snaps: RenderingSnapshot = new Array(entities.length);
        for (let i = 0; i < entities.length; i++) {
            const entity = world.getEntityRef(entities[i]!);
            const [r, p] = entity.with(Renderable, Position);

            const cx = (p.value.x - camera.x) * camera.zoom + camera.width / 2;
            const cy = (p.value.y - camera.y) * camera.zoom + camera.height / 2;

            const snapshot = {
                x: cx,
                y: cy,
                spriteId: r.spriteId,
                zIndex: r.layer,
                entityId: entity.id,
            } satisfies RenderingSnapshotEntry;
            snaps[i] = snapshot;
        }

        return snaps;
    }
}