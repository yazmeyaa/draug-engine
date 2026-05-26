import { Position } from "@draug/engine/std-components";
import { ColliderRectangle } from "../components/collider";
import { COLLISION_EVENT_KEY, type CollisionEvent } from "../events/collision";
import {
    System,
    SystemBase,
    type EventBuffer,
    type ComponentStorage,
    type SystemComputeContext,
    type SystemInitContext
} from "@draug/engine";

type Box = { top: number; right: number; bottom: number; left: number; };
@System({
    name: "CollisionSystem",
    query: {
        include: [Position, ColliderRectangle],
    }
})
export class CollisionSystem extends SystemBase {
    private colliderStore!: ComponentStorage<ColliderRectangle>;
    private transformStore!: ComponentStorage<Position>;
    private collisionEvents!: EventBuffer<CollisionEvent>;
    public override onInit({ world }: SystemInitContext): void {
        this.colliderStore = world.components.getStorage(ColliderRectangle);
        this.transformStore = world.components.getStorage(Position);
        this.collisionEvents = world.events.getBuffer(COLLISION_EVENT_KEY)
    }

    public compute(ctx: SystemComputeContext): void {
        const { entities } = ctx;
        for (let i = 0; i < entities.length; i++) {
            const aId = entities[i]!;
            const a = this.getBox(this.transformStore.tryGet(aId), this.colliderStore.tryGet(aId));
            for (let j = i + 1; j < entities.length; j++) {
                const bId = entities[j]!;
                const b = this.getBox(this.transformStore.tryGet(bId), this.colliderStore.tryGet(bId));
                if (!this.checkAABB(a, b))
                    continue;
                this.collisionEvents.write({
                    objA: {
                        colliderId: aId,
                        position: {
                            x: a.left,
                            y: b.top,
                        }
                    },
                    objB: {
                        colliderId: bId,
                        position: {
                            x: b.left,
                            y: b.top,
                        }
                    }
                })
            }
        }
    }

    private getBox(t: Readonly<Position>, c: Readonly<ColliderRectangle>): Box {
        return {
            top: t.value.y + c.offsetY,
            right: t.value.x + c.width + c.offsetX,
            bottom: t.value.y + c.height + c.offsetY,
            left: t.value.x + c.offsetX
        }
    }

    private checkAABB(a: Readonly<Box>, b: Readonly<Box>): boolean {
        return (
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top
        );
    }
}