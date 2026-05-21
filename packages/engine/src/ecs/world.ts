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
import { EntitiesManager, type EntityID, EntityRef } from "./entity";
import { SystemsManager } from "./system";
import { ECS_DEFAULTS } from "./constant";
import { EventBus } from "./events-buffer";
import { ComponentsManager } from "./components";
import { ResourcesManager } from "./resources/resources";
import { Commands } from "./command";
import { QueryManager, type QueryParameters } from "./query";
import { PluginsManager } from "./plugin";
import type { Logger } from "../logger";
import type { Clock } from "../runtime";

export type WorldConstructor = {
    maxEntityCount?: number;
    logger: Logger;
};

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

    private entityRefs_ = new Map<number, EntityRef>();

    constructor(params: WorldConstructor) {
        this.entities = new EntitiesManager(params.logger);
        this.components = new ComponentsManager(params.maxEntityCount ?? ECS_DEFAULTS.MAX_ENTITY_COUNT);
        this.systems = new SystemsManager(this, params.logger);
        this.events = new EventBus();
        this.resources = new ResourcesManager(params.logger);
        this.commands = new Commands(this, params.logger);
        this.queries = new QueryManager(this);
        this.plugins = new PluginsManager(params.logger);
        this.logger = params.logger;
    }

    public getEntityRef(id: number): EntityRef {
        let ref = this.entityRefs_.get(id);
        if (!ref) {
            ref = new EntityRef(this, id);
            this.entityRefs_.set(id, ref);
        }
        return ref;
    }
    public query(params: QueryParameters): number[] {
        return this.queries.get(params);
    }

    public removeComponent<T extends object>(ref: EntityRef, component: ComponentType<T>): void;
    public removeComponent<T extends object>(entity: EntityID, component: ComponentType<T>): void;
    public removeComponent<T extends object>(
        entity: EntityID | EntityRef,
        component: ComponentType<T>
    ): void {
        const id = typeof entity === 'number' ? entity : entity.id;

        const storage = this.components.getStorage(component);
        storage.remove(id);

        this.queries.invalidate(component);
    }

    public addComponent<T extends object>(id: EntityID, component: ClassType<T>, initFn?: (obj: T) => void): T;
    public addComponent<T extends object>(id: EntityRef, component: ClassType<T>, initFn?: (obj: T) => void): T
    public addComponent<T extends object>(entity: EntityID | EntityRef, component: ClassType<T>, initFn?: (obj: T) => void): T {
        const storage = this.components.getStorage(component);
        let id: number;
        if (typeof entity === 'number') {
            id = entity;
        } else {
            id = entity.id;
        }
        const c = storage.add(id, (o) => {
            if (initFn) {
                initFn(o);
            }
            return o;
        });
        this.queries.invalidate(component);

        return c;
    };

    public update(clock: Clock): void {
        this.systems.update(clock.getTime());
        this.commands.flush(this);
    }

    public build(): void {
        this.plugins.build();
        this.logger.debug(() => "World was built successfully");
    }
};
