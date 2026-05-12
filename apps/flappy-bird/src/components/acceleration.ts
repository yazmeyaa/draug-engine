import { Component } from "@amber-game/engine";

@Component()
export class Acceleration {
    constructor(
        public ax = 0,
        public ay = 0,
    ) { };
};