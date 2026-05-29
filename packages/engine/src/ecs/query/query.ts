import type { ComponentType } from "../components";
import type { EntityID } from "../entity";
import type { World } from "../world";
import { Bitmap } from "bitmap-index";

export type QueryParameters = {
    include?: ComponentType[];
    exclude?: ComponentType[];
    anyOf?: ComponentType[];
    excludeEntitiesIds?: number[];
    filter?: (id: number) => boolean;
};

type CachedQuery = {
    params: QueryParameters;
    bitmap: Bitmap;
    dirty: boolean;
    deps: Set<ComponentType>;
};

export class QueryManager {
    private cache = new Map<string, CachedQuery>();

    constructor(
        private readonly world: World,
    ) { }

    public get(params: QueryParameters): EntityID[] {
        const key = this.getKey(params);
        let entry = this.cache.get(key);

        if (!entry) {
            entry = {
                params,
                bitmap: this.compute(params),
                dirty: false,
                deps: this.collectDeps(params),
            };
            this.cache.set(key, entry);
        }

        if (entry.dirty) {
            entry.bitmap = this.compute(entry.params);
            entry.dirty = false;
        }

        // 1. Динамически применяем исключение конкретных ID 
        let targetBitmap = entry.bitmap;
        if (params.excludeEntitiesIds?.length) {
            targetBitmap = entry.bitmap.clone(); 
            const excludeBm = new Bitmap();
            for (const id of params.excludeEntitiesIds) {
                excludeBm.set(id);
            }
            targetBitmap.andNot(excludeBm);
        }

        // 2. Динамически применяем фильтр
        if (params.filter) {
            const result: number[] = [];
            targetBitmap.range(id => {
                if (params.filter!(id)) result.push(id);
            });
            return result;
        }

        return this.extractIds(targetBitmap);
    }

    public invalidate(component: ComponentType): void {
        for (const entry of this.cache.values()) {
            if (entry.deps.has(component)) {
                entry.dirty = true;
            }
        }
    }

    private getKey(q: QueryParameters): string {
        return [
            this.ids(q.include),
            this.ids(q.exclude),
            this.ids(q.anyOf),
        ].join("|");
    }

    private ids(arr?: ComponentType[]): string {
        if (!arr || arr.length === 0) return "";
        return arr
            .map(c => this.world.components.getComponentId(c))
            .sort((a, b) => a - b)
            .join(",");
    }

    private collectDeps(q: QueryParameters): Set<ComponentType> {
        const set = new Set<ComponentType>();
        q.include?.forEach(c => set.add(c));
        q.exclude?.forEach(c => set.add(c));
        q.anyOf?.forEach(c => set.add(c));
        return set;
    }

    private compute(params: QueryParameters): Bitmap {
        let result = this.combineBitmaps(params.include, 'and');

        const any = this.combineBitmaps(params.anyOf, 'or');
        if (any) {
            result = result ? result.and(any) : any;
        }

        if (!result) {
            return new Bitmap();
        }

        this.applyExclusions(result, params.exclude);
        return result;
    }

    private combineBitmaps(
        components: ComponentType[] | undefined,
        op: 'and' | 'or'
    ): Bitmap | null {
        if (!components?.length) return null;

        let result: Bitmap | null = null;
        let hasAtLeastOneValid = false;

        for (const c of components) {
            const bm = this.world.components.getStorage(c)?.bitmap();

            if (!bm) {
                if (op === 'and') {
                    return new Bitmap();
                }
                continue;
            }

            hasAtLeastOneValid = true;
            if (!result) {
                result = bm.clone();
            } else {
                op === 'and' ? result.and(bm) : result.or(bm);
            }
        }

        if (op === 'or' && !hasAtLeastOneValid) {
            return new Bitmap();
        }

        return result;
    }

    private applyExclusions(
        target: Bitmap,
        excludeComponents?: ComponentType[],
    ): void {
        if (excludeComponents?.length) {
            for (const c of excludeComponents) {
                const bm = this.world.components.getStorage(c)?.bitmap();
                if (bm) target.andNot(bm);
            }
        }
    }

    private extractIds(bitmap: Bitmap): number[] {
        const result: number[] = [];
        bitmap.range(id => { result.push(id) });
        return result;
    }
}