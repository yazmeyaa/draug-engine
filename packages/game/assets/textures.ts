import { Asset, AssetsManager, AssetStorage, type AssetLoader } from "@draug/assets/assets";

export class TextureResource extends Asset<Uint8Array> { };

export function createTexturesStorage(
    manager: AssetsManager,
    loader: AssetLoader<Uint8Array>,
): AssetStorage<Uint8Array> {
    return manager.register(TextureResource, loader);
}