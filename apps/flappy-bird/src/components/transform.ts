import { Component } from "@draug/engine";

@Component({name: "Transform"})
export class Transform {
    constructor(
        public x: number,
        public y: number,
        public rotate: number,
        public scaleX: number,
        public scaleY: number,
    ) { };
};