export {
    System,
    SystemBase,
    SystemError,
    ErrMissingSystemMetadata,
    ErrNotASystem,
    isSystem,
    getSystemMetadata,
    SystemsManager,
    type SystemComputeContext
} from './ecs/system';

export {
    World
} from './ecs/world';

export {
    Component,
    ComponentAlreadyRegisteredError,
    ComponentStorage,
    ComponentsManager,
    type IStorage,
    SingletonStorage,
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
} from './plugin';

export {
    EventBuffer,
    EventBus,
    createEventKey,
} from './ecs/events-buffer';
