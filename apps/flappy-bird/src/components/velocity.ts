import { Component } from "@amber-game/engine";

@Component()
export class Velocity {
    constructor(
        public vx = 0,
        public vy = 0,
    ) { };
};