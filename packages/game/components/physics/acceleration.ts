import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class Acceleration {
    constructor(
        public x = 0,
        public y = 0,
    ) {};
}