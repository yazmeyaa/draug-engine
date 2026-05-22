export {
    System,
    SystemBase,
    SystemError,
    ErrMissingSystemMetadata,
    ErrNotASystem,
    isSystem,
    getSystemMetadata,
    SystemsManager,
    SystemPhase,
    type SystemComputeContext,
    type SystemInitContext,
} from './ecs/system';

export {
    World
} from './ecs/world';

export {
    Component,
    ComponentAlreadyRegisteredError,
    ComponentStorage,
    ComponentsManager,
} from './ecs/components';

export { ResourcesManager } from './ecs/resources';

export {
    entry,
    Commands,
    type CreateEntityComponentEntry,
    type ComponentInitFn,
    type WorldCommand,
} from './ecs/command';

export {
    EntityMaskNotFoundError,
    EntityRef,
    EntitiesManager,
    UnregisteredComponentStorageError,
    type EntityID,
} from './ecs/entity';

export {
    Plugin,
    isPlugin,
    getPluginMetadata,
    PluginBase,
    PluginsManager,
    PluginError,
    ErrMissingPluginMetadata,
    ErrNotAPlugin,
    ErrPluginNotInit,
    ErrUnknownPlugin,
    type PluginID,
    type PluginMetadata,
    type PluginDependencies,
} from './ecs/plugin';

export {
    EventBuffer,
    EventBus,
    createEventKey,
} from './ecs/events-buffer';

export {
    Clock,
    Loop,
    Runtime,
    type TimeSource,
    type PlatformLoop,
    type StepFunction
} from './runtime';

export type { ClassType, ComponentType } from './types/class';

export {
    DAGNode,
    ErrDAGCycleDetected,
    VisitedState,
    topologicalSort,
} from './core/graph/dag';
export { ObjectPool } from './core/memory/pool';

export {
    AssetState,
    Asset,
    AssetStorage,
    AssetsManager,
    type AssetLoader,
    type AssetDisposer,
    type AssetID,
    type AssetIDGenerator,
} from './assets/assets';

export {
    Engine,
    type EngineConstructor,
} from './engine'

export {
    type Logger,
    LogLevel,
    type LogMessage,
} from './logger'