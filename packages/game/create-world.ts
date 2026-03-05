import { World } from "@/packages/engine/core/ecs/world";
import { Position } from "@/packages/game/components/position";
import { Velocity } from "@/packages/game/components/velocity";
import { ClassType } from "@/packages/types/class";
import { Renderable } from "@/packages/game/components/renderable";
import { MovementSystem } from "./systems/movement";
import { RenderingSystem } from "./systems/rendering";
import { AttractionSystem } from "./systems/world-attraction";

export function createWorld(): World {
    const world = new World();

    [Position, Velocity, Renderable]
        .forEach((x) => world.components.registerComponent(x as ClassType<object>));

    const systems = [
        new MovementSystem(),
        new RenderingSystem(),
        new AttractionSystem(),
    ]
    systems.forEach(x => world.systems.register(x, world));

    return world;
};