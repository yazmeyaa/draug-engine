import { WorldPhysicsResource } from "../resources/physics";
import { Acceleration } from "../components/acceleration";
import { GameStateResource, GameState } from "../resources/game-state";
import {
    System,
    SystemBase,
    type ComponentStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";
import { Velocity } from "@draug/engine/std-components";
import { InputSystem } from "./input";

@System({
    name: "GravitySystem",
    query: {
        include: [Velocity, Acceleration],
    },
    computeAfter: [InputSystem],
})
export class ApplyGravitySystem extends SystemBase {
    private worldPhysics!: WorldPhysicsResource;
    private velocityStore!: ComponentStorage<Velocity>;
    private accelerationStore!: ComponentStorage<Acceleration>;
    private gameState!: GameStateResource;

    public override onInit(ctx: SystemInitContext): void {
        const { world } = ctx;
        this.worldPhysics = world.resources.get(WorldPhysicsResource);
        this.velocityStore = world.components.getStorage(Velocity);
        this.accelerationStore = world.components.getStorage(Acceleration);
        this.gameState = world.resources.get(GameStateResource);
    }

    public compute(ctx: SystemComputeContext): void {
        if (this.gameState.state !== GameState.Playing) {
            return;
        }

        const { time, entities } = ctx;

        for (const id of entities) {
            const v = this.velocityStore.tryGet(id);
            const a = this.accelerationStore.tryGet(id);

            v.linear.y += this.worldPhysics.worldGravity * time.delta;
            v.linear.x += a.ax * time.delta;
            v.linear.y += a.ay * time.delta;

            a.ax = 0;
            a.ay = 0;
        }
    }
}
