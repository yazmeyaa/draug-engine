import { ClassType, ComponentType } from "@/packages/types/class";
import { ComponentsManager, ComponentStorage } from "./component";
import { EntitiesManager, EntityID } from "./entity";
import { SystemsManager } from "./system";
import { ECS_DEFAULTS } from "./constant";

export type QueryParameters = {
    components?: ComponentType[];
    excludeEntitiesIds?: number[];
}

export class World {
    public readonly entities = new EntitiesManager();
    public readonly components = new ComponentsManager();
    public readonly systems = new SystemsManager();

    constructor(maxEntityCount: number = ECS_DEFAULTS.MAX_ENTITY_COUNT) {
        this.components = new ComponentsManager(maxEntityCount);
    }

    public query(params: QueryParameters): number[] {
        const { components, excludeEntitiesIds } = params;
        if (!components || components.length === 0)
            return [];

        const stores: ComponentStorage<object>[] = new Array(components.length);
        for (let i = 0; i < components.length; i++)
            stores[i] = this.components.getComponentStorage(components[i]!);

        let base = stores[0]!;
        let minCount = base.entitiesCount();

        for (let i = 1; i < stores.length; i++) {
            const count = stores[i]!.entitiesCount();
            if (count < minCount) {
                base = stores[i]!;
                minCount = count;
            }
        }

        const result: number[] = [];
        const exclude = excludeEntitiesIds?.length
            ? new Set(excludeEntitiesIds)
            : null;

        base.forEachEntity((id) => {
            if (exclude && exclude.has(id))
                return;

            for (let i = 0; i < stores.length; i++) {
                const s = stores[i]!;
                if (s === base)
                    continue;

                if (!s.hasComponent(id))
                    return;
            }

            result.push(id);
        });

        return result;
    }

    public addComponent<T extends object>(id: EntityID, component: ClassType<T>, initFn?: (obj: T) => void): void {
        const storage = this.components.getComponentStorage(component);
        storage.addComponent(id, (o) => {
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
