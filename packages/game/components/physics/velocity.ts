import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class Velocity {
    public vx: number = 0;
    public vy: number = 0;
};
