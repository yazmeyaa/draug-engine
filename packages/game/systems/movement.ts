import { System, SystemComputeContext } from "@/packages/engine/core/ecs/system";
import { ClassType } from "@/packages/types/class";
import { Position } from "../components/position";
import { Velocity } from "../components/velocity";

export class MovementSystem extends System {
    public requiredComponents: ClassType<object>[] = [Position, Velocity];

    public compute(ctx: SystemComputeContext): void {
        const { entities, world } = ctx;
        const pStore = world.components.getComponentStorage(Position);
        const vStore = world.components.getComponentStorage(Velocity);

        for (let i = 0; i < entities.length; i++) {
            const id = entities[i]!;
            const p = pStore.tryGet(id);
            const v = vStore.tryGet(id);

            p.x += v.vx;
            p.y += v.vy;
        }
    }
};