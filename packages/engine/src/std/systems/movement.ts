import type { ComponentStorage } from "../../ecs/components";
import { System, SystemBase, type SystemComputeContext, type SystemInitContext } from "../../ecs/system";
import { Position, Velocity } from "../components";

@System({
    name: "MovementSystem_stdlib",
    query: {
        include: [Position, Velocity]
    },
})
/** Integrates `Position` by `Velocity` each frame. */
export class MovementSystem extends SystemBase {
    private transformStore!: ComponentStorage<Position>;
    private velocityStore!: ComponentStorage<Velocity>;
    /** Caches required storages once at system initialization time. */
    public onInit(ctx: SystemInitContext): void {
        this.transformStore = ctx.world.components.getStorage(Position);
        this.velocityStore = ctx.world.components.getStorage(Velocity);
    }
    /** Applies linear velocity to position for all matched entities. */
    public compute(ctx: SystemComputeContext): void {
        for(const id of ctx.entities) {
            const t = this.transformStore.tryGet(id);
            const v = this.velocityStore.tryGet(id);
            t.value.add(v.linear);
        }
    }
}
