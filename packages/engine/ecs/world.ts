import { type ClassType, type ComponentType } from "@amber-game/types/class";
import { EntitiesManager, type EntityID, EntityRef } from "./entity";
import { SystemsManager } from "./system";
import { ECS_DEFAULTS } from "./constant";
import { EventBus } from "./events-buffer";
import { ComponentsManager, type IStorage } from "./components";
import { ResourcesManager } from "./resources/resources";

export type QueryParameters = {
    include?: ComponentType[];
    excludeEntitiesIds?: number[];
}

export class World {
    public readonly entities = new EntitiesManager();
    public readonly components = new ComponentsManager();
    public readonly systems = new SystemsManager();
    public readonly events = new EventBus();
    public readonly resources = new ResourcesManager();

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
        const { excludeEntitiesIds, include } = params;
        if (!include || include.length === 0)
            return [];

        const stores: IStorage<object>[] = new Array(include.length);
        for (let i = 0; i < include.length; i++)
            stores[i] = this.components.getStorage(include[i]!);

        let base = stores[0]!;
        let minCount = base.size();

        for (let i = 1; i < stores.length; i++) {
            const count = stores[i]!.size();
            if (count < minCount) {
                base = stores[i]!;
                minCount = count;
            }
        }

        const result: number[] = [];
        const exclude = excludeEntitiesIds?.length
            ? new Set(excludeEntitiesIds)
            : null;

        base.forEach((id) => {
            if (exclude && exclude.has(id))
                return;

            for (let i = 0; i < stores.length; i++) {
                const s = stores[i]!;
                if (s === base)
                    continue;

                if (!s.has(id))
                    return;
            }

            result.push(id);
        });

        return result;
    }

    public addComponent<T extends object>(id: EntityID, component: ClassType<T>, initFn?: (obj: T) => void): void;
    public addComponent<T extends object>(id: EntityRef, component: ClassType<T>, initFn?: (obj: T) => void): void
    public addComponent<T extends object>(entity: EntityID | EntityRef, component: ClassType<T>, initFn?: (obj: T) => void): void {
        const storage = this.components.getStorage(component);
        let id: number;
        if (typeof entity === 'number') {
            id = entity;
        } else {
            id = entity.id;
        }
        storage.add(id, (o) => {
            if (initFn) {
                initFn(o);
            }
            return o;
        });
    };

    public update(dt: number): void {
        this.systems.update(this, dt);
    }
};
