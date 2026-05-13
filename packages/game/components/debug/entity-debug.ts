import { Component } from "@draug/engine";

@Component()
export class EntityDebug {
    constructor(
        public name: string,
        public description?: string,
    ){}
}