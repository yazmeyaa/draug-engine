import type { World } from "../ecs/world";
import { Transform, Velocity } from "./components";
import { MovementSystem } from "./systems";

export function injectStd(world: World): void {
    world.components.register(Transform);
    world.components.register(Velocity);
    world.systems.register(new MovementSystem());
}
