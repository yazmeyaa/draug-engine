import type { ClassType, ComponentType } from "@amber-game/types/class";
import { SystemBase } from "../ecs/system";
import type { World } from "../ecs/world";
import { DAGNode, topologicalSort, ErrDAGCycleDetected } from '@amber-game/core/graph/dag';

export type PluginID = string;

export type PluginDependencies = {
    components?: ComponentType[];
    resources?: ClassType<any>[];
    systems?: ClassType<SystemBase>[];
    plugins?: Array<{ id: PluginID; version?: string }>;
}

export interface PluginMetadata {
    id: PluginID;
    version: string;
    name: string;
    dependencies?: PluginDependencies;
}

const PluginMetadataSymbol = Symbol("plugin");

export function Plugin(metadata: PluginMetadata): ClassDecorator {
    return (target: Function) => {
        if ('__proto__' in target && target.__proto__ !== PluginBase)
            throw new ErrNotAPlugin(target);

        (target as FunctionWithMetadata)[PluginMetadataSymbol] = metadata;
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
    metadata: PluginMetadata;
};

export class PluginError extends Error {
    constructor(pluginId: string) {
        super(`Plugin error! Plugin [${pluginId}]`);
    }
}

export class ErrNotAPlugin extends Error {
    constructor(target: Function) {
        super(`Provided class ${target.name} is not a Plugin! Every plugin must extends of PluginBase class.`);
    }
}

export class ErrMissingPluginMetadata extends Error {
    constructor(plugin: ClassType<PluginBase>) {
        super(`Provided class ${plugin.name}: Missing plugin metadata! Define plugin class with @Plugin decorator.`);
    }
}

export class ErrUnknownPlugin extends PluginError {
    constructor(pluginId: string) {
        super(pluginId);
        this.message = `${super.message}: Plugin not found in manager.`;
    }
}

export class ErrPluginNotInit extends PluginError {
    constructor(pluginId: string) {
        super(pluginId);
        this.message = `${super.message}: Plugin not initiated yet. You must use PluginsManager.build() before getting instance.`;
    }
}

export class ErrMissingPluginDependency extends PluginError {
    constructor(pluginId: string, missingDepId: string) {
        super(pluginId);
        this.message = `${super.message}: Missing required dependency [${missingDepId}]. Install it first.`;
    }
}

export class ErrDAGCycleDetectedPlugin extends Error {
    constructor() {
        super(`Cycle detected in plugin dependencies!`);
    }
}

export class PluginsManager {
    private plugins_: Map<PluginID, PluginManagerInternalPluginStorageItem<any>> = new Map();
    private isInitiated_ = false;

    public install<T extends ClassType<PluginBase>>(plugin: T, ...constructorProps: ConstructorParameters<T>): void {
        if (!isPlugin(plugin))
            throw new ErrMissingPluginMetadata(plugin);

        const metadata = getPluginMetadata(plugin);

        if (this.plugins_.has(metadata.id))
            return;

        const entry: PluginManagerInternalPluginStorageItem<T> = {
            ctor: plugin,
            ctorParams: constructorProps,
            metadata,
        };

        this.plugins_.set(metadata.id, entry);
    }

    public build(): void {
        const nodes = new Map<PluginID, DAGNode<PluginID>>();
        for (const id of this.plugins_.keys()) {
            nodes.set(id, new DAGNode(id));
        }

        for (const [id, entry] of this.plugins_) {
            const node = nodes.get(id)!;
            const depPlugins = entry.metadata.dependencies?.plugins ?? [];

            for (const dep of depPlugins) {
                const depNode = nodes.get(dep.id);
                if (!depNode) {
                    throw new ErrMissingPluginDependency(id, dep.id);
                }
                node.vertices.push(depNode);
            }
        }

        let sortedNodes: DAGNode<PluginID>[];
        try {
            sortedNodes = topologicalSort(nodes.values());
        } catch (e) {
            if (e instanceof ErrDAGCycleDetected) {
                throw new ErrDAGCycleDetectedPlugin();
            }
            throw e;
        }

        for (const node of sortedNodes) {
            const entry = this.plugins_.get(node.data)!;
            const { ctor, ctorParams } = entry;
            entry.instance = new ctor(...ctorParams);
        }

        this.isInitiated_ = true;
    }

    public getPluginMetadata(pluginOrId: ClassType<PluginBase> | PluginID): PluginMetadata {
        const id = this.resolveId(pluginOrId);
        const entry = this.plugins_.get(id);
        if (!entry) throw new ErrUnknownPlugin(id);
        return entry.metadata;
    }

    public getPluginInstance<T extends PluginBase>(pluginOrId: ClassType<T> | PluginID): T {
        if (!this.isInitiated_) {
            throw new Error("Plugin instance is not initiated yet. Use PluginManager.build() before use plugins.");
        }

        const id = this.resolveId(pluginOrId);

        const entry = this.plugins_.get(id);
        if (!entry) throw new ErrUnknownPlugin(id);
        if (!entry.instance) throw new ErrPluginNotInit(id);

        return entry.instance as T;
    }

    private resolveId(pluginOrId: ClassType<PluginBase> | PluginID): PluginID {
        if (typeof pluginOrId === 'string') {
            return pluginOrId;
        }

        if (!isPlugin(pluginOrId)) {
            throw new ErrMissingPluginMetadata(pluginOrId);
        }

        return getPluginMetadata(pluginOrId).id;
    }
};


@Plugin({
    id: "physics.plugin",
    name: "Physics plugin",
    version: "1.0.0",
})
export class PhysicsPlugin extends PluginBase { };

@Plugin({
    id: "example.plugin",
    name: "Just an example plugin",
    version: "1.0.0",
    dependencies: {
        components: [],
        resources: [],
        systems: [],
        plugins: [{ id: "physics.plugin", version: "1.0.0" }],
    }
})
export class ExamplePlugin extends PluginBase { };