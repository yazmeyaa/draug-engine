import { ColliderRectangle } from "../components/collider";
import { Transform } from "../components/transform";
import { COLLISION_EVENT_KEY, type CollisionEvent } from "../events/collision";
import {
    System,
    SystemBase,
    type EventBuffer,
    type IStorage,
    type SystemComputeContext,
    type SystemInitContext
} from "@draug/engine";

type Box = { top: number; right: number; bottom: number; left: number; };
@System({
    query: {
        include: [Transform, ColliderRectangle],
    }
})
export class CollisionSystem extends SystemBase {
    private colliderStore!: IStorage<ColliderRectangle>;
    private transformStore!: IStorage<Transform>;
    private collisionEvents!: EventBuffer<CollisionEvent>;
    public override onInit({ world }: SystemInitContext): void {
        this.colliderStore = world.components.getStorage(ColliderRectangle);
        this.transformStore = world.components.getStorage(Transform);
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

    private getBox(t: Readonly<Transform>, c: Readonly<ColliderRectangle>): Box {
        return {
            top: t.y + c.offsetY,
            right: t.x + c.width + c.offsetX,
            bottom: t.y + c.height + c.offsetY,
            left: t.x + c.offsetX
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