import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import type { World } from "@amber-game/engine/ecs/world";
import type { IStorage } from "@amber-game/engine/ecs/components";
import { WorldPhysicsResource } from "../resources/physics";
import { Acceleration } from "../components/acceleration";
import { Velocity } from "../components/velocity";
import type { QueryParameters } from "@amber-game/engine/ecs/query";

export class ApplyGravitySystem extends System {
    public query: Readonly<QueryParameters> = {
        include: [Velocity, Acceleration],
    };
    private worldPhysics!: WorldPhysicsResource;
    private velocityStore!: IStorage<Velocity>;
    private accelerationStore!: IStorage<Acceleration>;

    public override onInit(world: World): void {
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