import type { ComponentType } from "../components";
import type { EntityID } from "../entity";
import { World } from "../world";

/** Command executed against world state at flush time. */
export type WorldCommand = (world: World) => void;
/** Initializer callback used when creating component entries. */
export type ComponentInitFn<C extends ComponentType> =
    (component: InstanceType<C>) => void;

/** Tuple describing one component to add when deferred entity is materialized. */
export type CreateEntityComponentEntry<T extends ComponentType = ComponentType> =
    T extends unknown ? [T, ComponentInitFn<T>] : never;

/** Convenience helper for creating typed deferred entity component entries. */
export function entry<T extends ComponentType>(
    component: T,
    init: ComponentInitFn<T> = () => { }
): CreateEntityComponentEntry {
    return [component, init as ComponentInitFn<ComponentType>];
}

/**
 * Deferred world command queue.
 *
 * Commands are executed after systems finish for a frame.
 */
export class Commands {
    private readonly commandsQueue_: WorldCommand[] = [];

    constructor(
        private readonly world: World,
    ) { }

    /** Enqueues a custom command. */
    public add(cmd: WorldCommand): void {
        this.commandsQueue_.push(cmd);
    };
    /** Executes all queued commands and clears the queue. */
    public flush(world: World): void {
        for (const cmd of this.commandsQueue_)
            cmd(world);
        this.commandsQueue_.length = 0;
    }
    /**
     * Creates an entity id immediately and defers component attachment.
     */
    public createEntity(...entries: CreateEntityComponentEntry[]): EntityID {
        const id = this.world.createEntity();

        const cmd = (world: World) => {
            for (const [cls, initFn] of entries) {
                world.addComponent(id, cls, initFn);
            }
        }
        this.add(cmd);
        return id;
    }
    /** Defers entity destruction. */
    public destroyEntity(id: EntityID): void {
        const cmd = (world: World) => {
            world.destroyEntity(id);            
        }
        this.add(cmd);
    }
};
