import { System, SystemBase, SystemPhase, World } from "@draug/engine";
import { ConfigurationResource } from "../resources/config";

@System({
    query: {},
    phase: SystemPhase.POST,
})
export class ConfigCommitSystem extends SystemBase {
    private configResource!: ConfigurationResource;
    public onInit(world: World): void {
        this.configResource = world.resources.get(ConfigurationResource);
    }
    public compute(): void {
        this.configResource.config.commit();
    }
};