import type { ClassType, ComponentType } from "@amber-game/types/class";
import { System } from "../ecs/system";
import type { World } from "../ecs/world"

export type PluginDependencies = {
    components?: ComponentType[];
    resources?: ClassType<any>[];
    systems?: ClassType<System>[];
}

export interface PluginMetadata {
    id: string;
    version: string;
    dependencies?: PluginDependencies;
}

const PluginMetadataSymbol = Symbol();
export function Plugin(metadata: PluginMetadata): ClassDecorator {
    return (target) => {
        target.prototype[PluginMetadataSymbol] = metadata;
    };
}

export function getPluginMetadata(plugin: Function): PluginMetadata {
    if (PluginMetadataSymbol in plugin) {
        return plugin[PluginMetadataSymbol] as PluginMetadata;
    }
    throw new Error("Provided constructor is not a Plugin. Every plugin must be registered via ```@Plugin({...})``` decorator.");
}

export abstract class PluginBase {
    public abstract readonly name: string;

    public onPluginLoad?: (world: World) => void;
    public onPluginUnload?: (world: World) => void;

    public onAfterWorldInit?: (world: World) => void;
}
