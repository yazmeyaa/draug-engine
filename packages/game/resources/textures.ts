import { Resource, ResourcesStorage, type ResourceID } from "@amber-game/resources/resource";

export class TextureResource extends Resource<Uint8Array> { };

export function createTexturesStorage(
  loader: (id: ResourceID, url: string) => Promise<Uint8Array>
): ResourcesStorage<Uint8Array, TextureResource> {
  return new ResourcesStorage(
    (id, loaderFn, url) => new TextureResource(id, url, loaderFn),
    loader
  );
}