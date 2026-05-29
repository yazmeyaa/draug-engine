import type { World } from "../../ecs/world";
import type { ComponentType } from "../../types/class";
import { Position, Velocity, Rotation } from "../components";
import { MovementSystem } from "../systems";

/**
 * Registers default std components and movement system in the world.
 */
export function injectStd(world: World): void {
    for (const p of [Position, Velocity, Rotation] as ComponentType[])
        world.components.register(p);
    world.systems.register(new MovementSystem());
}
