import { Plugin, PluginBase, type World } from "@draug/engine";
import { ConfigurationResource } from "./resources/config";

const configurationResourceFactory = () => new ConfigurationResource();

@Plugin({
    id: "draug-std-plugins.config",
    name: "Config [Draug STD Plugin]",
    version: "0.0.1",
})
export class ConfigPlugin extends PluginBase {
    public onAfterWorldInit = (world: World) => {
        world.resources.getOrInsert(ConfigurationResource, configurationResourceFactory);
    };
};