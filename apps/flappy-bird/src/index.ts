import type { SystemBase } from "@draug/engine";
import { BrowserGame } from "./browser-game";
import { ApplyGravitySystem } from "./systems/gravity";
import { CollisionSystem } from "./systems/collision";
import { createBird } from "./prefabs/bird";
import { FlappyTag } from "./components/flappy-tag";
import { Renderable } from "./components/renderable";
import { createBox } from "./prefabs/box";
import { Camera } from "./render/types";
import { GameActions } from "./resources/actions";
import { InputSystem } from "./systems/input";
import { BindCameraSystem } from "./systems/bind-camera";
import { COLLISION_EVENT_KEY } from "./events/collision";
import { ImageAsset } from "./assets/image";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const debugPanel = document.getElementById('debug-panel');
if (!debugPanel)
    throw new Error("no debug pannel HMTL element found!")

const game = new BrowserGame(ctx, debugPanel, (world) => {
    const colisions = world.events.getBuffer(COLLISION_EVENT_KEY);
    const fStore = world.components.getStorage(FlappyTag);
    const evts = colisions.read();
    for (const evt of evts) {
        fStore.forEach(birdId => {
            if (evt.objA.colliderId === birdId || evt.objB.colliderId === birdId) {
                alert("Game over");
                window.location.reload();
            }
        })
        console.log(evt);
    }
});


const camera = game.world.resources.get(Camera);
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


const systems: SystemBase[] = [
    new ApplyGravitySystem(),
    new CollisionSystem(),
    new InputSystem(),
    new BindCameraSystem(),
];
systems.forEach(s => {
    game.world.systems.register(s)
});
console.log(game.world.systems.getRequiredComponents())
for (const c of game.world.systems.getRequiredComponents()) {
    console.log(c)
    game.world.components.register(c);
}

game.world.components.register(FlappyTag)
game.world.components.register(Renderable)

const inputResource = game.world.resources.insert(GameActions, new GameActions);
window.addEventListener('keydown', event => {
    if (event.code === 'Space')
        inputResource.jump = true;
})
window.addEventListener('keyup', () => {
    inputResource.jump = false;
})





const imageResourceStore = game.engine.assets.register(ImageAsset, (url) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = reject;

        img.src = url;
    });
});

game.engine.init();
const birdSprite = imageResourceStore.add('/assets/bird.png');
const boxSprite = imageResourceStore.add('/assets/box.png');
game.engine.assets.loadAll().then(() => {
    game.start();

    createBird(game.world, {
        transform: {
            x: 0,
            y: 200,
        },
        renderable: {
            spriteId: birdSprite.id,
            layer: 1
        },
        velocity: {
            x: 9,
            y: 0
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
                x: i * 400,
                y: i * 82,
            },
        });
    }
})