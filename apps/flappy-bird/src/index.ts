import type { SystemBase } from "@draug/engine";
import { BrowserGame } from "./browser-game";
import { ApplyGravitySystem } from "./systems/gravity";
import { CollisionSystem } from "./systems/collision";
import { PipeSpawnerSystem } from "./systems/pipe-spawner";
import { ScoreSystem } from "./systems/score";
import { createBird } from "./prefabs/bird";
import { Camera } from "./render/types";
import { GameActions } from "./resources/actions";
import { GameStateResource } from "./resources/game-state";
import { InputSystem } from "./systems/input";
import { BindCameraSystem } from "./systems/bind-camera";
import { ImageAsset } from "./assets/image";
import { BIRD_START, resetPipeSpawner } from "./game/reset";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const debugPanel = document.getElementById("debug-panel");
if (!debugPanel) {
    throw new Error("no debug panel HTML element found!");
}

const entityPanel = document.getElementById("entity-panel");
if (!entityPanel) {
    throw new Error("no entity panel HTML element found!");
}

const settingsPanel = document.getElementById("settings-panel");
if (!settingsPanel) {
    throw new Error("no settings panel HTML element found!");
}

const game = new BrowserGame(ctx, debugPanel, entityPanel, settingsPanel);

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

const pipeSpawnerSystem = new PipeSpawnerSystem();
const systems: SystemBase[] = [
    new InputSystem(),
    new ApplyGravitySystem(),
    new CollisionSystem(),
    new ScoreSystem(),
    pipeSpawnerSystem,
    new BindCameraSystem(),
];
systems.forEach(s => {
    game.world.systems.register(s);
});

for (const c of game.world.systems.getRequiredComponents()) {
    game.world.components.register(c);
}

const inputResource = game.world.resources.get(GameActions);

function onJumpInput(): void {
    inputResource.jump = true;
}

window.addEventListener("keydown", event => {
    if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        onJumpInput();
    }
});

canvas.addEventListener("pointerdown", () => {
    onJumpInput();
});

const imageResourceStore = game.engine.assets.register(ImageAsset, url => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
});

game.engine.init();
const birdSprite = imageResourceStore.add("/assets/bird.png");
const boxSprite = imageResourceStore.add("/assets/box.png");

game.engine.assets.loadAll().then(() => {
    game.start();

    pipeSpawnerSystem.setSpriteId(boxSprite.id);

    const gameState = game.world.resources.get(GameStateResource);
    gameState.birdId = createBird(game.world, {
        transform: {
            x: BIRD_START.x,
            y: BIRD_START.y,
        },
        renderable: {
            spriteId: birdSprite.id,
            layer: 1,
        },
        velocity: {
            x: BIRD_START.vx,
            y: BIRD_START.vy,
        },
        collider: {
            width: 34,
            height: 34,
            offsetX: -17,
            offsetY: -17,
        },
    });

    resetPipeSpawner(game.world);
    camera.y = 0;
});
