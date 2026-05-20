import { WorldPhysicsResource } from "../resources/physics";
import { Acceleration } from "../components/acceleration";
import { Velocity } from "../components/velocity";
import {
    System,
    SystemBase,
    type IStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";

@System({
    query: {
        include: [Velocity, Acceleration],
    }
})
export class ApplyGravitySystem extends SystemBase {
    private worldPhysics!: WorldPhysicsResource;
    private velocityStore!: IStorage<Velocity>;
    private accelerationStore!: IStorage<Acceleration>;

    public override onInit(ctx: SystemInitContext): void {
        const { world } = ctx;
        this.worldPhysics = world.resources.getOrInsert(WorldPhysicsResource, () => new WorldPhysicsResource());
        this.velocityStore = world.components.getStorage(Velocity);
        this.accelerationStore = world.components.getStorage(Acceleration);
    }

    public compute(ctx: SystemComputeContext): void {
        const { dt, entities } = ctx;

        for (const id of entities) {
            const v = this.velocityStore.tryGet(id);
            const a = this.accelerationStore.tryGet(id);

            v.vy += this.worldPhysics.worldGravity * (dt / 1000);
            v.vx += a.ax * (dt / 1000);
            v.vy += a.ay * (dt / 1000);

            a.ax = 0;
            a.ay = 0;
        }
    }
};