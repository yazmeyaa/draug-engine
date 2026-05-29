import type { ClassType } from "../types/class";

/** Lifecycle status for an asset instance. */
export enum AssetState {
    NOT_READY = 1,
    LOADING = 2,
    READY = 3,
};
export type AssetLoader<T> = (url: string) => Promise<T>;
export type AssetDisposer<T> = (r: T) => void | Promise<void>;

/** Single loadable/disposable asset instance. */
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

    /**
     * Loads asset data once and reuses in-flight promise while loading.
     */
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

    /** Disposes loaded data and resets state. */
    public async dispose(): Promise<void> {
        this.disposed_ = true;

        if (this.data_)
            await this.disposer(this.data_);

        this.reset();
    }

    /**
     * Returns loaded data.
     *
     * @throws Error when asset is not in READY state.
     */
    public getData(): TData {
        if (this.state_ !== AssetState.READY)
            throw new Error("Data is not loaded yet!");
        return this.data_!;
    }
}

export type AssetID = number;
export type AssetIDGenerator = () => AssetID;
/** Stores and manages assets of one logical type. */
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

    /** Adds an asset using storage default loader/disposer. */
    public add(url: string): Asset<TData> {
        const id = this.nextIdFn_();
        const rs = this.newAsset(id, url, this.defaultLoader_, this.defaultDisposer_);
        this.items_.set(id, rs);

        return rs;
    };

    /** Adds an asset with custom loader/disposer pair. */
    public addCustom(url: string, customLoader: AssetLoader<TData>, customDisposer: AssetDisposer<TData>): Asset<TData> {
        const id = this.nextIdFn_();
        const rs = this.newAsset(id, url, customLoader, customDisposer);
        this.items_.set(id, rs);

        return rs;
    }

    /** Gets asset or `null` when missing. */
    public get(id: AssetID): Asset<TData> | null {
        const item = this.items_.get(id);
        return item ?? null;
    }

    /**
     * Gets asset by id.
     *
     * @throws Error when missing.
     */
    public tryGet(id: AssetID): Asset<TData> {
        const item = this.items_.get(id);
        if (!item)
            throw new Error(`Asset with id ${id} in storage ${this.constructor.name} not exist`);

        return item;
    }

    /** Disposes and removes one asset. */
    public async remove(id: AssetID): Promise<void> {
        const item = this.items_.get(id);
        if (!item) return;

        await item.dispose();
        this.items_.delete(id);
    }

    /** Loads all currently registered assets. */
    public async loadAll(): Promise<void> {
        await Promise.all(
            Array.from(this.items_.values(), r => r.load())
        );
    }

    /** Disposes and clears all assets. */
    public async clearAll(): Promise<void> {
        await Promise.all(
            Array.from(this.items_.values(), r => r.dispose())
        );
        this.items_.clear();
    }
}

const NOOP_DISPOSER: AssetDisposer<any> = async () => { };
/** Registry of typed asset storages. */
export class AssetsManager {
    private readonly storages_ = new Map<ClassType<Asset<any>>, AssetStorage<any>>();
    private currId = 0;
    private nextIdFn = () => {
        return ++this.currId;
    }
    /**
     * Registers a storage for a typed asset constructor.
     */
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

    /** Gets storage or `null` when not registered. */
    public getStorage<T>(res: ClassType<Asset<T>>): AssetStorage<T> | null {
        return this.storages_.get(res) ?? null;
    }

    /**
     * Gets storage by constructor.
     *
     * @throws Error when storage was not registered.
     */
    public tryGetStorage<T>(res: ClassType<Asset<T>>): AssetStorage<T> {
        const s = this.storages_.get(res);
        if (!s)
            throw new Error(`Storage ${res.name} is not registered!`);

        return s;
    }

    /** Loads assets across all registered storages. */
    public async loadAll(): Promise<void> {
        await Promise.all(Array.from(this.storages_.values(), (s) => s.loadAll()));
    }

    /** Disposes assets in all registered storages. */
    public disposeAll(): void {
        Array.from(this.storages_.values(), (s) => s.clearAll())
    }
}
