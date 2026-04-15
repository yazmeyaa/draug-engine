import type { System } from "@amber-game/engine/ecs/system";
import { BrowserGame } from "./browser-game";
import { ApplyGravitySystem } from "./systems/gravity";
import { CollisionSystem } from "./systems/collision";
import { MovementSystem } from "./systems/movement";
import { createBird } from "./prefabs/bird";
import { FlappyTag } from "./components/flappy-tag";
import { Renderable } from "./components/renderable";
import { createBox } from "./prefabs/box";
import { Asset } from "@amber-game/assets/assets";
import { RenderView } from "./render/renderer";
import type { Camera } from "./render/types";
import { Transform } from "./components/transform";

const camera = {
    x: 0,
    y: 0,
    zoom: 1.2,
    width: 800,
    height: 600,
} satisfies Camera;

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function resizeCanvas() {
    const dpr = window.devicePixelRatio ?? 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    camera.width = w;
    camera.height = h;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


const game = new BrowserGame((world) => {
    const renderView = new RenderView(game.runtime.world, camera)
    const rStore = world.components.getStorage(Renderable);
    const snapshot = renderView.snapshot().sort((a, b) => a.zIndex - b.zIndex);

    ctx.clearRect(0, 0, camera.width, camera.height);

    const tStore = world.components.getStorage(Transform);
    for (const entry of snapshot) {
        const r = rStore.tryGet(entry.entityId);
        const data = game.runtime.resources.tryGetStorage(ImageResource).tryGet(r.spriteId).getData();
        const t = tStore.tryGet(entry.entityId);

        ctx.save();

        const rad = t.rotate * Math.PI / 180;

        ctx.translate(entry.x, entry.y);


        ctx.rotate(rad);
        ctx.drawImage(data, -50, -50, 100, 100);

        ctx.restore();
    }

})

const systems: System[] = [
    new ApplyGravitySystem(),
    new CollisionSystem(),
    new MovementSystem(),
];
systems.forEach(s => {
    game.world.systems.register(s)
});
for (const c of game.world.systems.getRequiredComponents()) {
    game.world.components.register(c);
}

game.world.components.register(FlappyTag)
game.world.components.register(Renderable)


game.world.systems.build();



class ImageResource extends Asset<HTMLImageElement> { }
const imageResourceStore = game.runtime.resources.register(ImageResource, (url) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = reject;

        img.src = url;
    });
});

const birdSprite = imageResourceStore.add('/assets/bird.png');
const boxSprite = imageResourceStore.add('/assets/box.png');
imageResourceStore.loadAll().then(() => {
    game.start();

    createBird(game.world, {
        transform: {
            x: 0,
            y: 200,
            rotate: 0,
            scaleX: 1,
            scaleY: 1
        },
        renderable: {
            spriteId: birdSprite.id,
            layer: 1
        },
        velocity: {
            vx: 10,
            vy: 0
        },
        collider: {
            width: 64,
            height: 64,
            offsetX: 0,
            offsetY: 0
        }
    })
    for (let i = 0; i < 10; i++) {
        createBox(game.world, {
            collider: {
                width: 64,
                height: 64,
                offsetX: 0,
                offsetY: 0
            },
            renderable: {
                spriteId: boxSprite.id,
                layer: 1
            },
            transform: {
                x: 200,
                y: i * 82,
                rotate: 0,
                scaleX: 0,
                scaleY: 0
            },
        });
    }
})