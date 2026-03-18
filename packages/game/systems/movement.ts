import { ComponentType } from "@amber-game/engine/ecs/component";
import { System, SystemComputeContext } from "@amber-game/engine/ecs/system";
import { Position } from "../components/position";
import { Velocity } from "../components/velocity";

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