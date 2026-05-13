import type { ClassType } from "@draug/types/class";

export enum AssetState {
    NOT_READY = 1,
    LOADING = 2,
    READY = 3,
};
export type AssetLoader<T> = (url: string) => Promise<T>;
export type AssetDisposer<T> = (r: T) => void | Promise<void>;

export class Asset<TData> {
    private data_: TData | null = null;
    private state_ = AssetState.NOT_READY;
    private loading_: Promise<TData> | null = null;
    private disposed_ = false;

    constructor(
        public readonly id: number,
        private readonly url: string,
        private readonly loader: AssetLoader<TData>,
        private readonly disposer: AssetDisposer<TData>,
    ) { }

    public async load(): Promise<TData> {
        if (this.state_ === AssetState.READY)
            return this.data_!;

        if (this.state_ === AssetState.LOADING)
            return this.loading_!;

        this.state_ = AssetState.LOADING;
        this.disposed_ = false;

        this.loading_ = this.loader(this.url)
            .then(data => {
                if (this.disposed_) return data;

                this.data_ = data;
                this.state_ = AssetState.READY;
                this.loading_ = null;
                return data;
            }).catch(err => {
                this.state_ = AssetState.NOT_READY;
                this.loading_ = null;
                throw err;
            });

        return this.loading_;
    }
    private reset() {
        this.data_ = null;
        this.loading_ = null;
        this.state_ = AssetState.NOT_READY;
    }

    public async dispose(): Promise<void> {
        this.disposed_ = true;

        if (this.data_)
            await this.disposer(this.data_);

        this.reset();
    }

    public getData(): TData {
        if (this.state_ !== AssetState.READY)
            throw new Error("Data is not loaded yet!");
        return this.data_!;
    }
}

export type AssetID = number;
export type AssetIDGenerator = () => AssetID;
export class AssetStorage<TData> {
    private readonly items_ = new Map<AssetID, Asset<TData>>();
    constructor(
        private readonly nextIdFn_: AssetIDGenerator,
        private readonly defaultLoader_: AssetLoader<TData>,
        private readonly defaultDisposer_: AssetDisposer<TData>,
    ) { };

    private newAsset(id: number, url: string, loader: AssetLoader<TData>, disposer: AssetDisposer<TData>): Asset<TData> {
        // TODO: Maybe object pool or something. By now its only allocate new object.
        return new Asset(id, url, loader, disposer);
    }

    public add(url: string): Asset<TData> {
        const id = this.nextIdFn_();
        const rs = this.newAsset(id, url, this.defaultLoader_, this.defaultDisposer_);
        this.items_.set(id, rs);

        return rs;
    };

    public addCustom(url: string, customLoader: AssetLoader<TData>, customDisposer: AssetDisposer<TData>): Asset<TData> {
        const id = this.nextIdFn_();
        const rs = this.newAsset(id, url, customLoader, customDisposer);
        this.items_.set(id, rs);

        return rs;
    }

    public get(id: AssetID): Asset<TData> | null {
        const item = this.items_.get(id);
        return item ?? null;
    }

    public tryGet(id: AssetID): Asset<TData> {
        const item = this.items_.get(id);
        if (!item)
            throw new Error(`Asset with id ${id} in storage ${this.constructor.name} not exist`);

        return item;
    }

    public async remove(id: AssetID): Promise<void> {
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

const NOOP_DISPOSER: AssetDisposer<any> = async () => { };
export class AssetsManager {
    private readonly storages_ = new Map<ClassType<Asset<any>>, AssetStorage<any>>();
    private currId = 0;
    private nextIdFn = () => {
        return ++this.currId;
    }
    public register<T>(
        res: ClassType<Asset<T>>,
        defaultLoader: AssetLoader<T>,
        defaultDisposer: AssetDisposer<T> = NOOP_DISPOSER,
    ): AssetStorage<T> {
        const storage = new AssetStorage(
            this.nextIdFn,
            defaultLoader,
            defaultDisposer,
        );
        this.storages_.set(res, storage);

        return storage;
    }

    public getStorage<T>(res: ClassType<Asset<T>>): AssetStorage<T> | null {
        return this.storages_.get(res) ?? null;
    }

    public tryGetStorage<T>(res: ClassType<Asset<T>>): AssetStorage<T> {
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