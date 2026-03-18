import { System, SystemComputeContext } from "@amber-game/engine/ecs/system";
import { World } from "@amber-game/engine/ecs/world";
import { MovementSystem } from "./movement";
import { ComponentType } from "@amber-game/engine/ecs/component";
import { Position } from "../components/position";
import { Renderable } from "../components/renderable";

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
    constructor() {
        super(MovementSystem)
    }
    public requiredComponents: ComponentType[] = [Renderable, Position];
    public queryComponents: ComponentType[] = [Renderable, Position];
    public compute(_ctx: SystemComputeContext): void { }

    public getSnapshot(world: World, camera: Camera): RenderingSnapshot {
        const entities = world.query({ include: [Position, Renderable] });
        const snaps: RenderingSnapshot = new Array(entities.length);
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i]!;
            const [r, p] = entity.with(Renderable, Position);

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
};