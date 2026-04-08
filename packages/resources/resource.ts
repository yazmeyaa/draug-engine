import type { ClassType } from "@amber-game/types/class";

type ResourceID = number;

export class Resource<T extends object> {
    private data_: T | null = null;
    private loaded_ = false;
    
    constructor(
        public readonly id: ResourceID,
        private loader?: () => Promise<T>,
    ) { }

    public setLoader(loader: () => Promise<T>) {
        if (this.loader) throw new Error("Loader already set");
        this.loader = loader;
    }

    public async load() {
        if (!this.loader) throw new Error("Loader is not defined");
        this.data_ = await this.loader();
        this.loaded_ = true;
        return this.data_;
    }

    public dispose() {
        this.data_ = null;
        this.loaded_ = false;
    }

    public getData(): T {
        if (!this.loaded_) throw new Error("Resource not loaded");
        return this.data_!;
    }
};

export class ResourcesStorage<T extends object> {
    private items_ = new Map<ResourceID, Resource<T>>();

    constructor(
        private defaultLoader: (id: ResourceID) => Promise<T>
    ) {}

    public add(id: ResourceID) {
        const resource = new Resource<T>(id);
        resource.setLoader(() => this.defaultLoader(id));
        this.items_.set(id, resource);
        return resource;
    }

    public addCustom(id: ResourceID, customLoader: () => Promise<T>) {
        const resource = new Resource<T>(id, customLoader);
        this.items_.set(id, resource);
        return resource;
    }
    
    public get(id: ResourceID): Resource<T> | undefined {
        return this.items_.get(id);
    }

    public getAll(): Resource<T>[] {
        return Array.from(this.items_.values());
    }

    public async loadAll(): Promise<void> {
        await Promise.all(this.getAll().map(res => res.load()));
    }

    public disposeAll(): void {
        this.getAll().forEach(res => res.dispose());
    }
};

type ResourceMapKey = ClassType<Resource<any>>;

export class ResourcesManager {
    private readonly storagesMap = new Map<ResourceMapKey, ResourcesStorage<any>>();

    public registerStorage<T extends object>(
        resourceClass: ClassType<Resource<T>>,
        storage: ResourcesStorage<T>
    ): void {
        if (this.storagesMap.has(resourceClass)) {
            throw new Error(`Storage for ${resourceClass.name} is already registered.`);
        }
        this.storagesMap.set(resourceClass, storage);
    }

    public getStorage<T extends object>(
        resourceClass: ClassType<Resource<T>>
    ): ResourcesStorage<T> | undefined {
        return this.storagesMap.get(resourceClass) as ResourcesStorage<T> | undefined;
    }

    public getResource<T extends object>(
        resourceClass: ClassType<Resource<T>>,
        id: ResourceID
    ): Resource<T> | undefined {
        return this.getStorage(resourceClass)?.get(id);
    }

    public async loadResource<T extends object>(
        resourceClass: ClassType<Resource<T>>,
        id: ResourceID
    ): Promise<T | undefined> {
        const resource = this.getResource(resourceClass, id);
        return resource?.load();
    }

    public async loadAllStorages(): Promise<void> {
        const promises: Promise<void>[] = [];
        this.storagesMap.forEach(storage => {
            promises.push(storage.loadAll());
        });
        await Promise.all(promises);
    }

    public disposeAllStorages(): void {
        this.storagesMap.forEach(storage => {
            storage.disposeAll();
        });
    }
}