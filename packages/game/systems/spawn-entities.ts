import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import type { QueryParameters } from "@amber-game/engine/ecs/world";

export class SpawnEntitiesSystem extends System {
    public query: QueryParameters = {};
    public compute(ctx: SystemComputeContext): void {
        throw new Error("Method not implemented.");
    }

}