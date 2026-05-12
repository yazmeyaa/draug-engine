import type { ClassType, ComponentType } from "@amber-game/types/class";
import { System } from "../ecs/system";
import type { World } from "../ecs/world"

export type PluginID = string;

export type PluginDependencies = {
    components?: ComponentType[];
    resources?: ClassType<any>[];
    systems?: ClassType<System>[];
    plugins?: Array<Pick<PluginMetadata, "id" | "version">>
}

export interface PluginMetadata {
    id: PluginID;
    version: string;
    name: string;
    dependencies?: PluginDependencies;
}

const PluginMetadataSymbol = Symbol();
export function Plugin(metadata: PluginMetadata): ClassDecorator {
    return (target) => {
        if ('__proto__' in target && target.__proto__ !== PluginBase)
            throw new ErrNotAPlugin(target);

        target.prototype[PluginMetadataSymbol] = metadata;
    };
}

export function getPluginMetadata(plugin: ClassType<PluginBase>): PluginMetadata {
    if (hasMetadata(plugin)) {
        return plugin[PluginMetadataSymbol] as PluginMetadata;
    }
    throw new ErrMissingPluginMetadata(plugin);
}

type FunctionWithMetadata = Function & { [PluginMetadataSymbol]: PluginMetadata };

export function hasMetadata(ctor: Function): ctor is FunctionWithMetadata {
    return PluginMetadataSymbol in ctor;
}

export function isPlugin(ctor: Function): boolean {
    return hasMetadata(ctor);
}

export abstract class PluginBase {
    public onPluginLoad?: (world: World) => void;
    public onPluginUnload?: (world: World) => void;
    public onAfterWorldInit?: (world: World) => void;
}

type PluginManagerInternalPluginStorageItem<T extends ClassType<PluginBase>> = {
    ctor: T;
    ctorParams: ConstructorParameters<T>;
    instance?: InstanceType<T>;
};

export class PluginError extends Error {
    constructor(plugin: ClassType<PluginBase>) {
        super(`Plugin error! Plugin [${plugin.name}]`);
    }
}
export class ErrNotAPlugin extends Error {
    constructor(target: Function) {
        super(`Provided class ${target.name} is not a Plugin! Every plugin must extends of PluginBase class.`);
    }
};
export class ErrMissingPluginMetadata extends PluginError {
    constructor(plugin: ClassType<PluginBase>) {
        super(plugin);
        this.message = `${super.message}: Missing plugin metadata! Define plugin class with @Plugin decorator.`
    }
};

export class ErrUnknownPlugin extends PluginError { };
export class ErrPluginNotInit extends PluginError {
    constructor(plugin: ClassType<PluginBase>) {
        super(plugin);
        const msg = "Plugin not initiated yet. You must use PluginsManager.init() before getting instance of plugin.";
        this.message = [this.message, msg].join(': ');
    }
};

export class PluginsManager {
    private plugins_: Map<ClassType<PluginBase>, PluginManagerInternalPluginStorageItem<any>> = new Map();
    private isInitiated_ = false;

    public install<T extends ClassType<PluginBase>>(plugin: T, ...constructorProps: ConstructorParameters<T>): void {
        if (!isPlugin(plugin))
            throw new ErrMissingPluginMetadata(plugin);

        if (this.plugins_.has(plugin))
            return;
        const entry: PluginManagerInternalPluginStorageItem<T> = {
            ctor: plugin,
            ctorParams: constructorProps,
        };
        this.plugins_.set(plugin, entry);
    }

    public init(): void {
        for (const entry of this.plugins_.values()) {
            const { ctor, ctorParams } = entry;
            entry.instance = new ctor(...ctorParams);
        }

        this.isInitiated_ = true;
    }

    public getPluginMetadata(plugin: ClassType<PluginBase>): PluginMetadata {
        return getPluginMetadata(plugin);
    }

    public getPluginInstance<T extends PluginBase>(plugin: ClassType<T>): T {
        if (!this.isInitiated_)
            throw new Error("Plugin instance is not initiated yet. Use PluginManager.init() before use plugins.");

        const entry = this.plugins_.get(plugin);
        if (!entry)
            throw new ErrUnknownPlugin(plugin);
        if (!entry.instance)
            throw new ErrPluginNotInit(plugin);
        return entry.instance as T;
    }
};
