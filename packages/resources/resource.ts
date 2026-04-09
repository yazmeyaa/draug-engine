import type { ClassType } from "@amber-game/types/class";

export type ResourceLoader<T> = (url: string) => Promise<T>;

export class Resource<TData> {
    private data_: TData | null = null;
    private isLoaded_ = false;
    constructor(
        public readonly id: number,
        private readonly url: string,
        private readonly loader: ResourceLoader<TData>
    ) { };

    public async load(): Promise<TData> {
        if (this.data_ !== null && this.isLoaded_)
            return this.data_!;
        const data = await this.loader(this.url);
        this.data_ = data;
        this.isLoaded_ = true;
        return data;
    }

    public dispose(): void {
        this.data_ = null;
        this.isLoaded_ = false;
    };

    public getData(): TData {
        if (this.data_ === null || !this.isLoaded_)
            throw new Error("Data is not loaded yet!");
        return this.data_;
    }
}

export type ResourceID = number;
export type ResourceIDGenerator = () => ResourceID;
export class ResourceStorage<TData> {
    private readonly items_ = new Map<ResourceID, Resource<TData>>();
    constructor(
        private readonly nextIdFn_: ResourceIDGenerator,
        private readonly defaultLoader_: ResourceLoader<TData>,
    ) { };

    private newResource(id: number, url: string, loader: ResourceLoader<TData>): Resource<TData> {
        // TODO: Maybe object pool or something. By now its only allocate new object.
        return new Resource(id, url, loader);
    }

    public add(url: string): Resource<TData> {
        const id = this.nextIdFn_();
        const rs = this.newResource(id, url, this.defaultLoader_);
        this.items_.set(id, rs);

        return rs;
    };

    public addCustom(url: string, customLoader: ResourceLoader<TData>): Resource<TData> {
        const id = this.nextIdFn_();
        const rs = this.newResource(id, url, customLoader);
        this.items_.set(id, rs);

        return rs;
    }

    public remove(id: ResourceID): void {
        const item = this.items_.get(id);
        if (!item) return;
        item.dispose();
        this.items_.delete(id);
    }

    public async loadAll(): Promise<void> {
        await Promise.all(
            Array.from(this.items_.values(), r => r.load())
        );
    }

    public clearAll(): void {
        for (const rs of this.items_.values())
            rs.dispose();
    }
}


export class ResourcesManager {
    private readonly storages_ = new Map<ClassType<Resource<any>>, ResourceStorage<any>>();
    private currId = 0;
    private nextIdFn(): number {
        return ++this.currId;
    }
    public register<T>(res: ClassType<Resource<T>>, defaultLoader: ResourceLoader<T>): ResourceStorage<T> {
        const storage = new ResourceStorage(
            this.nextIdFn,
            defaultLoader,
        );
        this.storages_.set(res, storage);

        return storage;
    }

    public getStorage<T>(res: ClassType<Resource<T>>): ResourceStorage<T> | null {
        return this.storages_.get(res) ?? null;
    }

    public tryGetStorage<T>(res: ClassType<Resource<T>>): ResourceStorage<T> {
        const s = this.storages_.get(res);
        if (!s)
            throw new Error(`Storage ${res.name} is not registered!`);

        return s;
    }

    public async loadAll(): Promise<void> {
        await Promise.all(Array.from(this.storages_.values(), (s) => s.loadAll()));
    }

    public disposeAll(): void {
        Array.from(this.storages_.values(), (s) => s.clearAll())
    }
}