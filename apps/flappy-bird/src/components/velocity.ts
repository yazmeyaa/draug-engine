import { Component } from "@draug/engine";

@Component({name: "Velocity"})
export class Velocity {
    constructor(
        public vx = 0,
        public vy = 0,
    ) { };
};