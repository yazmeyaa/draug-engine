import { type ClassType, type ComponentType } from "@amber-game/types/class";
import { EntitiesManager, type EntityID, EntityRef } from "./entity";
import { SystemsManager } from "./system";
import { ECS_DEFAULTS } from "./constant";
import { EventBus } from "./events-buffer";
import { ComponentsManager } from "./components";
import { ResourcesManager } from "./resources/resources";
import { Bitmap } from "bitmap-index";
import { Commands } from "./command";
import { QueryManager } from "./query";

export type QueryParameters = {
    include?: ComponentType[];
    exclude?: ComponentType[];
    anyOf?: ComponentType[];
    excludeEntitiesIds?: number[];
    filter?: (id: number) => boolean;
}

export class World {
    public readonly entities = new EntitiesManager();
    public readonly components = new ComponentsManager();
    public readonly events = new EventBus();
    public readonly resources = new ResourcesManager();
    public readonly systems = new SystemsManager(this);
    public readonly commands = new Commands(this);
    public readonly queryManager = new QueryManager(this);

    private entityRefs_ = new Map<number, EntityRef>();

    constructor(maxEntityCount: number = ECS_DEFAULTS.MAX_ENTITY_COUNT) {
        this.components = new ComponentsManager(maxEntityCount);
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
        return this.queryManager.get(params);
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

        this.queryManager.invalidate(component);
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
        this.queryManager.invalidate(component);
        return c;
    };

    public update(dt: number): void {
        this.systems.update(dt);
        this.commands.flush(this);
    }
};
