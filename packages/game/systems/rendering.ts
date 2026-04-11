import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { World } from "@amber-game/engine/ecs/world";
import { MovementSystem } from "./movement";
import { Transform} from "../components/transform";
import { Renderable } from "../components/renderable";
import type { ComponentType } from "@amber-game/engine/ecs/components";
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

export class RenderingSystem extends System {
    constructor() {
        super(MovementSystem)
    }
    public worldDependencies: ComponentType[] = [Renderable, Transform];
    public targetComponents: ComponentType[] = [Renderable, Transform];
    public compute(_ctx: SystemComputeContext): void { }

    public getSnapshot(world: World, camera: Camera): RenderingSnapshot {
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
};