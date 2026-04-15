import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class Acceleration {
    constructor(
        public ax = 0,
        public ay = 0,
    ) { };
};