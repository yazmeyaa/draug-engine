import type { ClassType } from "@amber-game/types/class";

export type ResourceID = number;

export class Resource<T extends object> {
    private data_: T | null = null;
    private loaded_ = false;
    
    constructor(
        public readonly id: ResourceID,
        private url_: string,
        private loader: (url: string) => Promise<T>,
    ) {}

    public async load() {
        this.data_ = await this.loader(this.url_);
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

    public getUrl(): string | undefined {
        return this.url_;
    }
};

export class ResourcesStorage<
  TData extends object,
  TResource extends Resource<TData>
> {
  private items_ = new Map<ResourceID, TResource>();
  private nextId = 0;

  constructor(
    private factory: (id: ResourceID, loader: (url: string) => Promise<TData>, url: string) => TResource,
    private defaultLoader: (id: ResourceID, url: string) => Promise<TData>
  ) {}

  private generateId(): ResourceID {
    return this.nextId++;
  }

  public add(url: string): TResource {
    const id = this.generateId();
    const resource = this.factory(id, (u) => this.defaultLoader(id, u), url);
    this.items_.set(id, resource);
    return resource;
  }

  public addByUrl(url: string): TResource {
    return this.add(url);
  }

  public addCustom(customLoader: (url: string) => Promise<TData>, url: string): TResource {
    const id = this.generateId();
    const resource = this.factory(id, customLoader, url);
    this.items_.set(id, resource);
    return resource;
  }

  public get(id: ResourceID): TResource | undefined {
    return this.items_.get(id);
  }

  public getAll(): TResource[] {
    return Array.from(this.items_.values());
  }

  public async loadAll(): Promise<void> {
    await Promise.all(this.getAll().map(res => res.load()));
  }

  public disposeAll(): void {
    this.getAll().forEach(res => res.dispose());
  }
}

type ResourceMapKey = ClassType<Resource<any>>;

export class ResourcesManager {
    private readonly storagesMap = new Map<
        ResourceMapKey,
        ResourcesStorage<any, any>
    >();

    public registerStorage<
        TData extends object,
        TResource extends Resource<TData>
    >(
        resourceClass: ClassType<TResource>,
        storage: ResourcesStorage<TData, TResource>
    ): void {
        if (this.storagesMap.has(resourceClass)) {
            throw new Error(`Storage for ${resourceClass.name} is already registered.`);
        }
        this.storagesMap.set(resourceClass, storage);
    }

    public getStorage<
        TData extends object,
        TResource extends Resource<TData>
    >(
        resourceClass: ClassType<TResource>
    ): ResourcesStorage<TData, TResource> | undefined {
        return this.storagesMap.get(resourceClass) as
            | ResourcesStorage<TData, TResource>
            | undefined;
    }

    public getResource<
        TData extends object,
        TResource extends Resource<TData>
    >(
        resourceClass: ClassType<TResource>,
        id: ResourceID
    ): TResource | undefined {
        return this.getStorage(resourceClass)?.get(id);
    }

    public async loadResource<
        TData extends object,
        TResource extends Resource<TData>
    >(
        resourceClass: ClassType<TResource>,
        id: ResourceID
    ): Promise<TData | undefined> {
        const resource = this.getResource(resourceClass, id);
        return resource?.load();
    }

    public async loadAllStorages(): Promise<void> {
        await Promise.all(
            Array.from(this.storagesMap.values()).map(s => s.loadAll())
        );
    }

    public disposeAllStorages(): void {
        this.storagesMap.forEach(s => s.disposeAll());
    }
}