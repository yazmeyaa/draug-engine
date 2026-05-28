import type { ComponentStorage, World } from "@draug/engine";
import type { Camera, RenderingSnapshot, RenderingSnapshotEntry } from "./types";
import { Renderable } from "../components/renderable";
import { Position } from "@draug/engine/std-components";

export class RenderView {
    private renderableStore_: ComponentStorage<Renderable>;
    private positionStore_: ComponentStorage<Position>;
    constructor(
        private world: World,
        private camera_: Camera,
    ) {
        this.renderableStore_ = world.components.getStorage(Renderable);
        this.positionStore_ = world.components.getStorage(Position);
    }

    public get camera(): Camera {
        return this.camera_;
    }

    public snapshot(): RenderingSnapshot {
        const camera = this.camera_;
        const world = this.world;

        const entities = world.query({ include: [Position, Renderable] });
        const snaps: RenderingSnapshot = new Array(entities.length);
        for (let i = 0; i < entities.length; i++) {
            const id = entities[i]!;

            const r = this.renderableStore_.tryGet(id);
            const p = this.positionStore_.tryGet(id);

            const cx = (p.value.x - camera.x) * camera.zoom + camera.width / 2;
            const cy = (p.value.y - camera.y) * camera.zoom + camera.height / 2;

            const snapshot = {
                entityId: id,
                x: cx,
                y: cy,
                spriteId: r.spriteId,
                zIndex: r.layer,
            } satisfies RenderingSnapshotEntry;
            snaps[i] = snapshot;
        }

        return snaps;
    }
}