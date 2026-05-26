import { Resource } from "@draug/engine";

@Resource({ name: "WorldPhysicsResource" })
export class WorldPhysicsResource {
    constructor(public worldGravity = 28) {}
}
