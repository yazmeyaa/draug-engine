import type { World } from "@amber-game/engine";
import type { Camera, RenderingSnapshot, RenderingSnapshotEntry } from "./types";
import { Transform } from "../components/render/transform";
import { Renderable } from "../components/render/renderable";

export class RenderView {
    constructor(
        private world: World,
        private camera: Camera,
    ) { }

    public snapshot(): RenderingSnapshot {
        const camera = this.camera;
        const world = this.world;

        const entities = world.query({ include: [Transform, Renderable] });
        const snaps: RenderingSnapshot = new Array(entities.length);
        for (let i = 0; i < entities.length; i++) {
            const entity = world.getEntityRef(entities[i]!);
            const [r, p] = entity.with(Renderable, Transform);

            const cx = (p.x - camera.x) * camera.zoom + camera.width / 2;
            const cy = (p.y - camera.y) * camera.zoom + camera.height / 2;

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