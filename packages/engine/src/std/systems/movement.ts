import type { ComponentStorage } from "../../ecs/components";
import { System, SystemBase, type SystemComputeContext, type SystemInitContext } from "../../ecs/system";
import { Position, Velocity } from "../components";

@System({
    name: "MovementSystem_stdlib",
    query: {
        include: [Position, Velocity]
    },
})
export class MovementSystem extends SystemBase {
    private transformStore!: ComponentStorage<Position>;
    private velocityStore!: ComponentStorage<Velocity>;
    public onInit(ctx: SystemInitContext): void {
        this.transformStore = ctx.world.components.getStorage(Position);
        this.velocityStore = ctx.world.components.getStorage(Velocity);
    }
    public compute(ctx: SystemComputeContext): void {
        for(const id of ctx.entities) {
            const t = this.transformStore.tryGet(id);
            const v = this.velocityStore.tryGet(id);
            t.value.add(v.linear);
        }
    }
}
