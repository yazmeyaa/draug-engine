import { Component } from "../../ecs/components";
import { Vector3 } from "../math/vector";

@Component({ name: "Velocity_stdlib" })
export class Velocity {
    constructor(
        public readonly linear = new Vector3(),
    ) { }
};