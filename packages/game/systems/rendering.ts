import { System, SystemComputeContext } from "@/packages/engine/core/ecs/system";
import { ClassType } from "@/packages/types/class";
import { Position } from "../components/position";
import { Renderable } from "../components/renderable";
import { World } from "@/packages/engine/core/ecs/world";

export type RenderingSnapshotEntry = {
    entityId: number;
    x: number;
    y: number;
    spriteId: string;
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

export class RenderingSystem extends System {
    public requiredComponents: ClassType<object>[] = [Renderable, Position];
    public compute(_ctx: SystemComputeContext): void { }

    public getSnapshot(world: World, camera: Camera): RenderingSnapshot {
        const renderableStore = world.components.getComponentStorage(Renderable);
        const positionStore = world.components.getComponentStorage(Position);

        const ids = world.query({ components: [Position, Renderable] });
        const snaps: RenderingSnapshot = new Array(ids.length);
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i]!;
            const r = renderableStore.tryGet(id);
            const p = positionStore.tryGet(id);

            const cx = (p.x - camera.x) * camera.zoom + camera.width / 2;
            const cy = (p.y - camera.y) * camera.zoom + camera.height / 2;

            const snapshot = {
                x: cx,
                y: cy,
                spriteId: r.spriteId,
                zIndex: r.layer,
                entityId: id,
            } satisfies RenderingSnapshotEntry;
            snaps[i] = snapshot;
        }

        return snaps;
    }
};