import { Component } from "@draug/engine";

@Component()
export class Acceleration {
    constructor(
        public ax = 0,
        public ay = 0,
    ) { };
};