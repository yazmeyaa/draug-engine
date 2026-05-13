import { Component } from "@draug/engine";

@Component()
export class RectangleCollider {
    constructor(
        public width: number,
        public height: number,
    ) { };
};