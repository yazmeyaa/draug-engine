import { System, SystemComputeContext } from "@/packages/engine/core/ecs/system";
import { EntityRef } from "@/packages/engine/core/ecs/entity";
import { ComponentType } from "@/packages/types/class";
import { Position } from "@/packages/game/components/position";
import { Velocity } from "@/packages/game/components/velocity";

export class MovementSystem extends System {
    public requiredComponents: ComponentType[] = [Position, Velocity];
    public queryComponents: ComponentType[] = [Position, Velocity];
    constructor() {
        super()
    }

    public compute(ctx: SystemComputeContext): void {
        const { entities } = ctx;

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i]!;
            const [p, v] = entity.with(Position, Velocity);

            p.x += v.vx;
            p.y += v.vy;
        }
    }
};