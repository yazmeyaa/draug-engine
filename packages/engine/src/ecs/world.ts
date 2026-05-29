/*
ECS World implementation
⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⢻⣿⡗⢶⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⣄
⠀⢻⣇⠀⠈⠙⠳⣦⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⠶⠛⠋⣹⣿⡿
⠀⠀⠹⣆⠀⠀⠀⠀⠙⢷⣄⣀⣀⣀⣤⣤⣤⣄⣀⣴⠞⠋⠉⠀⠀⠀⢀⣿⡟⠁
⠀⠀⠀⠙⢷⡀⠀⠀⠀⠀⠉⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡾⠋⠀⠀
⠀⠀⠀⠀⠈⠻⡶⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣠⡾⠋⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣼⠃⠀⢠⠒⣆⠀⠀⠀⠀⠀⠀⢠⢲⣄⠀⠀⠀⢻⣆⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢰⡏⠀⠀⠈⠛⠋⠀⢀⣀⡀⠀⠀⠘⠛⠃⠀⠀⠀⠈⣿⡀⠀⠀⠀⠀
⠀⠀⠀⠀⣾⡟⠛⢳⠀⠀⠀⠀⠀⣉⣀⠀⠀⠀⠀⣰⢛⠙⣶⠀⢹⣇⠀⠀⠀⠀
⠀⠀⠀⠀⢿⡗⠛⠋⠀⠀⠀⠀⣾⠋⠀⢱⠀⠀⠀⠘⠲⠗⠋⠀⠈⣿⠀⠀⠀⠀
⠀⠀⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠈⠓⠒⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡇⠀⠀⠀
⠀⠀⠀⠀⠀⠈⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣧⠀⠀⠀
⠀⠀⠀⠀⠀⠈⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠁⠀⠀⠀
*/

import { type ClassType, type ComponentType } from "../types/class";
import { EntitiesManager, EntityCompositionIndex, type EntityID } from "./entity";
import { SystemsManager } from "./system";
import { ECS_DEFAULTS } from "./constant";
import { EventBus } from "./events-buffer";
import { ComponentsManager } from "./components";
import { ResourcesManager } from "./resources";
import { Commands } from "./command/command";
import { QueryManager, type QueryParameters } from "./query";
import { PluginsManager } from "./plugin";
import type { Logger } from "../logger";
import type { Clock } from "../runtime";

export type WorldConstructor = {
    /** Maximum number of entities addressable by bitmaps/sparse sets. */
    maxEntityCount?: number;
    /** Logger implementation used by internal managers. */
    logger: Logger;
};

/**
 * Main ECS façade.
 *
 * Exposes managers for entities/components/systems/events/resources/commands/plugins
 * and provides convenience methods for common structural mutations.
 */
export class World {
    public readonly entities: EntitiesManager;
    public readonly components: ComponentsManager;
    public readonly systems: SystemsManager;
    public readonly events: EventBus;
    public readonly resources: ResourcesManager;
    public readonly commands: Commands;
    public readonly queries: QueryManager;
    public readonly plugins: PluginsManager;
    private readonly logger: Logger;
    private readonly entityIndex: EntityCompositionIndex

    private updatesCount_ = 0;
    public get updatesCount(): number {
        return this.updatesCount_;
    }

    /**
     * Creates a new world instance and wires all managers.
     */
    constructor(params: WorldConstructor) {
        this.entities = new EntitiesManager(params.logger);
        this.components = new ComponentsManager(params.logger, params.maxEntityCount ?? ECS_DEFAULTS.MAX_ENTITY_COUNT);
        this.systems = new SystemsManager(this, params.logger);
        this.plugins = new PluginsManager(params.logger);
        this.resources = new ResourcesManager(params.logger);
        this.commands = new Commands(this);
        this.queries = new QueryManager(this);
        this.events = new EventBus();
        this.logger = params.logger;
        this.entityIndex = new EntityCompositionIndex();
    }

    /**
     * Creates an entity and registers it in the composition index.
     */
    public createEntity(): EntityID {
        const id = this.entities.create();
        this.entityIndex.addEntity(id);
        return id;
    };

    /**
     * Destroys an entity and removes all attached components first.
     */
    public destroyEntity(id: EntityID): void {
        const components = this.entityIndex.getComponents(id);
        for (const c of components) {
            this.removeComponent(id, c);
        }
        this.entityIndex.removeEntity(id);
        this.entities.destroy(id);
    }

    /**
     * Returns sorted IDs of currently active entities.
     */
    public getActiveEntityIds(): EntityID[] {
        return this.entityIndex.getEntityIds().sort((a, b) => a - b);
    }

    /**
     * Executes a cached query and returns matching entity IDs.
     */
    public query(params: QueryParameters): number[] {
        return this.queries.get(params);
    }

    public removeComponent<T extends object>(
        entity: EntityID,
        component: ComponentType<T>
    ): void {
        const storage = this.components.getStorage(component);
        storage.remove(entity);

        this.queries.invalidate(component);
        this.entityIndex.removeComponent(entity, component);
    }

    /**
     * Adds a component instance to an entity, optionally initializing it.
     */
    public addComponent<T extends object>(entity: EntityID, component: ClassType<T>, initFn?: (obj: T) => void): T {
        const storage = this.components.getStorage(component);
        const c = storage.add(entity, (o) => {
            if (initFn) {
                initFn(o);
            }
            return o;
        });
        this.queries.invalidate(component);
        this.entityIndex.addComponent(entity, component);

        return c;
    };

    /**
     * Executes one simulation tick.
     *
     * Order:
     * 1) systems update (which swaps event buffers before running systems)
     * 2) command queue flush
     */
    public update(clock: Clock): void {
        this.systems.update(clock.getTime());
        this.commands.flush(this);
        this.updatesCount_++;
    }

    /**
     * Finalizes world-level bootstrap (currently plugin initialization).
     */
    public build(): void {
        this.plugins.build();
        this.logger.debug(() => "World was built successfully");
    }
};
