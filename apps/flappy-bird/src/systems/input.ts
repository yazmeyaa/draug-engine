import { Velocity } from "@draug/engine/std-components";
import { FlappyTag } from "../components/flappy-tag";
import { BIRD_FORWARD_SPEED, resetRound } from "../game/reset";
import { GameActions } from "../resources/actions";
import { GameStateResource, GameState } from "../resources/game-state";
import {
    System,
    SystemBase,
    type ComponentStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";

const JUMP_VELOCITY = -12;
const START_VELOCITY = -10;

@System({
    name: "InputSystem",
    query: {
        include: [FlappyTag, Velocity],
    },
})
export class InputSystem extends SystemBase {
    private actionsResource!: GameActions;
    private velocityStore!: ComponentStorage<Velocity>;
    private gameState!: GameStateResource;

    public onInit({ world }: SystemInitContext): void {
        this.actionsResource = world.resources.get(GameActions);
        this.velocityStore = world.components.getStorage(Velocity);
        this.gameState = world.resources.get(GameStateResource);
    }

    public compute(ctx: SystemComputeContext): void {
        if (this.gameState.state === GameState.GameOver && this.actionsResource.jump) {
            resetRound(ctx.world);
            this.actionsResource.jump = false;
            return;
        }

        if (this.gameState.state === GameState.Start && this.actionsResource.jump) {
            this.gameState.state = GameState.Playing;
            this.actionsResource.jump = false;

            for (const id of ctx.entities) {
                this.velocityStore.tryGet(id).linear.y = START_VELOCITY;
                ctx.logger.info(() => `Jump (start): bird entity ${id}`);
            }
        }

        for (const id of ctx.entities) {
            const velocity = this.velocityStore.tryGet(id);

            if (this.gameState.state === GameState.Playing) {
                if (this.actionsResource.jump) {
                    velocity.linear.y = JUMP_VELOCITY;
                    this.actionsResource.jump = false;
                    ctx.logger.info(() => `Jump: bird entity ${id}`);
                }
                velocity.linear.x = BIRD_FORWARD_SPEED;
                continue;
            }

            velocity.linear.set(0, 0, 0);
        }
    }
}
