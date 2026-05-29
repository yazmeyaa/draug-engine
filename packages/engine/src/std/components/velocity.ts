import { Component } from "../../ecs/components";
import { Vector3 } from "../math/vector";

@Component({ name: "Velocity_stdlib" })
/** Standard linear velocity component (3D vector). */
export class Velocity {
    constructor(
        public readonly linear = new Vector3(),
    ) { }
};