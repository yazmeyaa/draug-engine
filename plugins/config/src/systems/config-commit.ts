import { System, SystemBase, SystemPhase, type SystemInitContext } from "@draug/engine";
import { ConfigurationResource } from "../resources/config";

@System({
    name: "ConfigCommitSystem",
    query: {},
    phase: SystemPhase.POST,
})
export class ConfigCommitSystem extends SystemBase {
    private configResource!: ConfigurationResource;
    public onInit({ world }: SystemInitContext): void {
        this.configResource = world.resources.get(ConfigurationResource);
    }
    public compute(): void {
        this.configResource.config.commit();
    }
};