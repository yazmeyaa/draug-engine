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

const NOT_AN_PLUGIN_ERROR_MESSAGE = (ctor: Function) => `Provided constructor [${ctor.name}] is not a Plugin. Every plugin must be registered via "@Plugin({...})" decorator.`;

function newErrorNotAnPlugin(ctor: Function): Error {
    return new Error(NOT_AN_PLUGIN_ERROR_MESSAGE(ctor));
}

export function getPluginMetadata(plugin: Function): PluginMetadata {
    if (hasMetadata(plugin)) {
        return plugin[PluginMetadataSymbol] as PluginMetadata;
    }
    throw newErrorNotAnPlugin(plugin);
}

type FunctionWithMetadata = Function & { [PluginMetadataSymbol]: PluginMetadata };

export function hasMetadata(ctor: Function): ctor is FunctionWithMetadata {
    return PluginMetadataSymbol in ctor;
}

export function isPlugin(ctor: Function): boolean {
    return hasMetadata(ctor);
}

export abstract class PluginBase {
    public abstract readonly name: string;

    public onPluginLoad?: (world: World) => void;
    public onPluginUnload?: (world: World) => void;

    public onAfterWorldInit?: (world: World) => void;
}


export class PluginsManager {
    private plugins_: Map<ClassType<PluginBase>, PluginBase> = new Map();

    public install(plugin: ClassType<PluginBase>): void {
        if (!isPlugin(plugin))
            throw newErrorNotAnPlugin(plugin);

        if (this.plugins_.has(plugin))
            return;

        this.plugins_.set(plugin, new plugin());
    }

    static getPluginMetadata(plugin: ClassType<PluginBase>): PluginMetadata {
        return getPluginMetadata(plugin.constructor);
    }
};
