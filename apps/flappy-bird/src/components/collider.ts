import { Component } from "@draug/engine";

@Component({name: "ColliderRectangle"})
export class ColliderRectangle {
    constructor(
        public width: number,
        public height: number,
        public offsetX = 0,
        public offsetY = 0,
    ) { }
};