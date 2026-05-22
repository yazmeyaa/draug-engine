import { WorldPhysicsResource } from "../resources/physics";
import { Acceleration } from "../components/acceleration";
import { Velocity } from "../components/velocity";
import {
    System,
    SystemBase,
    type ComponentStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";

@System({
    name: "GravitySystem",
    query: {
        include: [Velocity, Acceleration],
    }
})
export class ApplyGravitySystem extends SystemBase {
    private worldPhysics!: WorldPhysicsResource;
    private velocityStore!: ComponentStorage<Velocity>;
    private accelerationStore!: ComponentStorage<Acceleration>;

    public override onInit(ctx: SystemInitContext): void {
        const { world } = ctx;
        this.worldPhysics = world.resources.getOrInsert(WorldPhysicsResource, () => new WorldPhysicsResource());
        this.velocityStore = world.components.getStorage(Velocity);
        this.accelerationStore = world.components.getStorage(Acceleration);
    }

    public compute(ctx: SystemComputeContext): void {
        const { time, entities } = ctx;

        for (const id of entities) {
            const v = this.velocityStore.tryGet(id);
            const a = this.accelerationStore.tryGet(id);

            v.vy += this.worldPhysics.worldGravity * (time.delta);
            v.vx += a.ax * (time.delta);
            v.vy += a.ay * (time.delta);

            a.ax = 0;
            a.ay = 0;
        }
    }
};