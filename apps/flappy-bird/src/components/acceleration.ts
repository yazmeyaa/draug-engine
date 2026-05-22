import { Component } from "@draug/engine";

@Component({name: "Acceleration"})
export class Acceleration {
    constructor(
        public ax = 0,
        public ay = 0,
    ) { };
};