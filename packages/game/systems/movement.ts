import { System, SystemComputeContext } from "@/packages/engine/core/ecs/system";
import { EntityRef } from "@/packages/engine/core/ecs/entity";
import { ClassType } from "@/packages/types/class";
import { Position } from "@/packages/game/components/position";
import { Velocity } from "@/packages/game/components/velocity";

export class MovementSystem extends System {
    // Компоненты, которые необходимы для работы системы
    public requiredComponents: ClassType<object>[] = [Position, Velocity];
    // Объекты которые имеют эти компоненты будут инжектированы в контекст compute
    public queryComponents: ClassType<object>[] = [Position, Velocity];
    constructor() {
        super()
    }

    public compute(ctx: SystemComputeContext): void {
        const { entities, world } = ctx;

        for (let i = 0; i < entities.length; i++) {
            const id = entities[i]!;
            const [p, v] = new EntityRef(world, id).with(Position, Velocity);

            p.x += v.vx;
            p.y += v.vy;
        }
    }
};