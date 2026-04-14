import { type ClassType, type ComponentType } from "@amber-game/types/class";
import { EntitiesManager, type EntityID, EntityRef } from "./entity";
import { SystemsManager } from "./system";
import { ECS_DEFAULTS } from "./constant";
import { EventBus } from "./events-buffer";
import { ComponentsManager } from "./components";
import { ResourcesManager } from "./resources/resources";
import { Bitmap } from "bitmap-index";
import { Commands } from "./command";

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
    public readonly systems = new SystemsManager();
    public readonly events = new EventBus();
    public readonly resources = new ResourcesManager();
    public readonly commands = new Commands();

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
        let resultBits = this.combineBitmaps(params.include, 'and');

        const anyBits = this.combineBitmaps(params.anyOf, 'or');
        if (anyBits) {
            resultBits = resultBits ? resultBits.and(anyBits) : anyBits;
        }

        if (!resultBits) {
            return [];
        }

        this.applyExclusions(resultBits, params.exclude, params.excludeEntitiesIds);

        if (params.filter) {
            resultBits.filter(params.filter);
        }

        return this.extractIds(resultBits);
    }

    private combineBitmaps(components: any[] | undefined, operation: 'and' | 'or'): Bitmap | null {
        if (!components?.length) {
            return null;
        }

        const bitmaps = this.getValidBitmaps(components);
        if (bitmaps.length === 0) {
            return null;
        }

        const result = bitmaps[0]!.clone();

        for (let i = 1; i < bitmaps.length; i++) {
            if (operation === 'and') {
                result.and(bitmaps[i]!);
            } else {
                result.or(bitmaps[i]!);
            }
        }

        return result;
    }

    private getValidBitmaps(components: any[]): Bitmap[] {
        return components
            .map(c => this.components.getStorage(c)?.bitmap())
            .filter((bm): bm is Bitmap => bm !== null && bm !== undefined);
    }


    private applyExclusions(
        targetBitmap: Bitmap,
        excludeComponents: any[] | undefined,
        excludeIds: number[] | undefined
    ): void {
        if (excludeComponents?.length) {
            const excludeBitmaps = this.getValidBitmaps(excludeComponents);
            for (const bm of excludeBitmaps) {
                targetBitmap.andNot(bm);
            }
        }

        if (excludeIds?.length) {
            const excludeBits = new Bitmap();
            for (const id of excludeIds) {
                excludeBits.set(id);
            }
            targetBitmap.andNot(excludeBits);
        }
    }

    /**
     * Конвертирует битмап в массив чисел
     */
    private extractIds(bitmap: Bitmap): number[] {
        const result: number[] = [];
        bitmap.range(id => { result.push(id) });
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
        this.commands.flush(this);
    }
};
