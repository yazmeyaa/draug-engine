import { Resource, ResourcesManager, ResourceStorage, type ResourceLoader } from "@amber-game/resources/resource";

export class TextureResource extends Resource<Uint8Array> { };

export function createTexturesStorage(
    manager: ResourcesManager,
    loader: ResourceLoader<Uint8Array>,
): ResourceStorage<Uint8Array> {
    return manager.register(TextureResource, loader);
}