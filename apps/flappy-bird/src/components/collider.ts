import { Component } from "@amber-game/engine";

@Component()
export class ColliderRectangle {
    constructor(
        public width: number,
        public height: number,
        public offsetX = 0,
        public offsetY = 0,
    ) { }
};