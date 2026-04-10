import type { ClassType } from "@amber-game/types/class";

export enum ResourceState {
    NOT_READY = 1,
    LOADING = 2,
    READY = 3,
};
export type ResourceLoader<T> = (url: string) => Promise<T>;
export type ResourceDisposer<T> = (r: T) => void | Promise<void>;

export class Resource<TData> {
    private data_: TData | null = null;
    private state_ = ResourceState.NOT_READY;
    private loading_: Promise<TData> | null = null;
    private disposed_ = false;

    constructor(
        public readonly id: number,
        private readonly url: string,
        private readonly loader: ResourceLoader<TData>,
        private readonly disposer: ResourceDisposer<TData>,
    ) { }

    public async load(): Promise<TData> {
        if (this.state_ === ResourceState.READY)
            return this.data_!;

        if (this.state_ === ResourceState.LOADING)
            return this.loading_!;

        this.state_ = ResourceState.LOADING;
        this.disposed_ = false;

        this.loading_ = this.loader(this.url)
            .then(data => {
                if (this.disposed_) return data;

                this.data_ = data;
                this.state_ = ResourceState.READY;
                this.loading_ = null;
                return data;
            }).catch(err => {
                this.state_ = ResourceState.NOT_READY;
                this.loading_ = null;
                throw err;
            });

        return this.loading_;
    }
    private reset() {
        this.data_ = null;
        this.loading_ = null;
        this.state_ = ResourceState.NOT_READY;
    }

    public async dispose(): Promise<void> {
        this.disposed_ = true;

        if (this.data_)
            await this.disposer(this.data_);

        this.reset();
    }

    public getData(): TData {
        if (this.state_ !== ResourceState.READY)
            throw new Error("Data is not loaded yet!");
        return this.data_!;
    }
}

export type ResourceID = number;
export type ResourceIDGenerator = () => ResourceID;
export class ResourceStorage<TData> {
    private readonly items_ = new Map<ResourceID, Resource<TData>>();
    constructor(
        private readonly nextIdFn_: ResourceIDGenerator,
        private readonly defaultLoader_: ResourceLoader<TData>,
        private readonly defaultDisposer_: ResourceDisposer<TData>,
    ) { };

    private newResource(id: number, url: string, loader: ResourceLoader<TData>, disposer: ResourceDisposer<TData>): Resource<TData> {
        // TODO: Maybe object pool or something. By now its only allocate new object.
        return new Resource(id, url, loader, disposer);
    }

    public add(url: string): Resource<TData> {
        const id = this.nextIdFn_();
        const rs = this.newResource(id, url, this.defaultLoader_, this.defaultDisposer_);
        this.items_.set(id, rs);

        return rs;
    };

    public addCustom(url: string, customLoader: ResourceLoader<TData>, customDisposer: ResourceDisposer<TData>): Resource<TData> {
        const id = this.nextIdFn_();
        const rs = this.newResource(id, url, customLoader, customDisposer);
        this.items_.set(id, rs);

        return rs;
    }

    public get(id: ResourceID): Resource<TData> | null {
        const item = this.items_.get(id);
        return item ?? null;
    }

    public tryGet(id: ResourceID): Resource<TData> {
        const item = this.items_.get(id);
        if (!item)
            throw new Error(`Resource with id ${id} in storage ${this.constructor.name} not exist`);

        return item;
    }

    public async remove(id: ResourceID): Promise<void> {
        const item = this.items_.get(id);
        if (!item) return;

        await item.dispose();
        this.items_.delete(id);
    }

    public async loadAll(): Promise<void> {
        await Promise.all(
            Array.from(this.items_.values(), r => r.load())
        );
    }

    public async clearAll(): Promise<void> {
        await Promise.all(
            Array.from(this.items_.values(), r => r.dispose())
        );
        this.items_.clear();
    }
}

const NOOP_DISPOSER: ResourceDisposer<any> = async () => { };
export class ResourcesManager {
    private readonly storages_ = new Map<ClassType<Resource<any>>, ResourceStorage<any>>();
    private currId = 0;
    private nextIdFn = () => {
        return ++this.currId;
    }
    public register<T>(
        res: ClassType<Resource<T>>,
        defaultLoader: ResourceLoader<T>,
        defaultDisposer: ResourceDisposer<T> = NOOP_DISPOSER,
    ): ResourceStorage<T> {
        const storage = new ResourceStorage(
            this.nextIdFn,
            defaultLoader,
            defaultDisposer,
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