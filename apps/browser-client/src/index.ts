import { createPlayer } from "@draug/game/archetypes/players";
import { createTrainingTarget } from "@draug/game/archetypes/traning-target";
import { createFireball } from "@draug/game/archetypes/fireball";
import { createClientSideWorld } from "@draug/game/create-world";
import { ClientMovementDirection, ClientInputUpdate, ClientMessage } from "@draug/game/network/generated/client";
import { ServerMessage } from "@draug/game/network/generated/server";
import { BrowserGame } from "./browser-game";
import { Asset } from "@draug/engine";
import { RenderView } from "@draug/game/render/renderer"
import type { Camera } from "@draug/game/render/types";
import { PlayerActions } from '@draug/game/resources/player-actions'
import { Renderable } from "@draug/game/components/render/renderable";
import { Transform } from "@draug/game/components/render/transform";
import { EntityDebug } from "@draug/game/components/debug/entity-debug";

const world = createClientSideWorld();
world.systems.build();

let step = 0;
// let fps = 0;
let frameCount = 0;
let localPlayerId = -1;

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const camera = {
  x: 0,
  y: 0,
  zoom: 1.2,
  width: 800,
  height: 600,
} satisfies Camera;

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

const keysPressed: { [key: string]: boolean } = {};
let lastDx = 0;
let lastDy = 0;
let ws: WebSocket;

function calculateMovement(): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;

  if (keysPressed["KeyD"]) dx += 1;
  if (keysPressed["KeyA"]) dx -= 1;
  if (keysPressed["KeyW"]) dy -= 1;
  if (keysPressed["KeyS"]) dy += 1;

  return { dx, dy };
}

function sendMovement(dx: number, dy: number) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const movementMsg = ClientMovementDirection.create({ dx, dy });
  const inputMessage = ClientInputUpdate.create({ clientMovementDirection: movementMsg });

  const clientMsg: ClientMessage = ClientMessage.create({
    payload: {
      $case: "clientInputUpdate",
      clientInputUpdate: inputMessage,
    },
  });

  const encoded = ClientMessage.encode(clientMsg).finish();
  ws.send(encoded);
}

const game = new BrowserGame(world, (world) => {
  step += 1;
  frameCount++;

  const { dx, dy } = calculateMovement();
  if (dx !== lastDx || dy !== lastDy) {
    sendMovement(dx, dy);
    lastDx = dx;
    lastDy = dy;

    let localPlayerState = playerActions.data.get(localPlayerId);
    if (!localPlayerState) {
      localPlayerState = { movement: { dx: 0, dy: 0, } };
      playerActions.data.set(localPlayerId, localPlayerState);
    }

    localPlayerState.movement.dx = dx;
    localPlayerState.movement.dy = dy;
  }

  const renderView = new RenderView(game.runtime.world, camera)
  const rStore = world.components.getStorage(Renderable);
  const snapshot = renderView.snapshot().sort((a, b) => a.zIndex - b.zIndex);

  ctx.clearRect(0, 0, camera.width, camera.height);

  const tStore = world.components.getStorage(Transform);
  const debugStore = world.components.getStorage(EntityDebug);
  for (const entry of snapshot) {
    const debug = debugStore.get(entry.entityId);
    const r = rStore.tryGet(entry.entityId);
    const data = game.runtime.assets.tryGetStorage(ImageResource).tryGet(r.spriteId).getData();
    const t = tStore.tryGet(entry.entityId);

    ctx.save();

    const rad = t.rotation * Math.PI / 180;

    ctx.translate(entry.x, entry.y);

    if (debug) {
      ctx.font = "normal 24px serif";
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(debug.name, -50, -60);
      ctx.strokeText(debug.name, -50, -60);
    }

    ctx.rotate(rad);
    ctx.drawImage(data, -50, -50, 100, 100);

    ctx.restore();
  }
})
// game.start();

ws = new WebSocket("ws://localhost:8090");
ws.binaryType = 'arraybuffer'

window.addEventListener("keydown", (e) => {
  keysPressed[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  keysPressed[e.code] = false;
});

ws.onopen = () => {
  console.log("Connected to server");
};

ws.onclose = () => {
  console.log("Disconnected from server");
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onmessage = (event) => {
  const data = ServerMessage.decode(new Uint8Array(event.data));
  switch (data.payload?.$case) {
    case 'motionUpdates':
      if (data.payload.motionUpdates.movementDirectionChange.length > 0)
        console.log(data.payload.motionUpdates.movementDirectionChange.map(x => `Entity ${x.entityId}: dx=${x.dx}, dy=${x.dy}`).join(''))
      break;
    default:
      console.error('No data in payload!')
  }
};

const playerActions = new PlayerActions();
game.runtime.world.resources.insert(PlayerActions, playerActions);

class ImageResource extends Asset<HTMLImageElement> { }
const imageResourceStore = game.runtime.assets.register(ImageResource, (url) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = url;
  });
});

const trainingTargetTexture = imageResourceStore.add('/assets/sprites/training_target_sprite_001.png')
const dummyCharacterTexture = imageResourceStore.add('/assets/sprites/dummy_char.png')
const dummyFireballTexture = imageResourceStore.add('assets/sprites/dummy_fireball.png')
imageResourceStore.loadAll().then(() => {
  createTrainingTarget(world, {
    transform: {
      x: 1,
      y: 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    },
    renderable: {
      layer: 10,
      spriteId: trainingTargetTexture.id,
    },
    collider: {
      radius: 10,
    }
  })

  localPlayerId = createPlayer(world, {
    transform: {
      x: 250 - (-1 * 100),
      y: 150,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    isLocal: true,
    renderable: {
      layer: 1,
      spriteId: dummyCharacterTexture.id,
    },
    baseSpeed: { speed: 100 }
  })

  for (let i = 0; i < 6; i++) {
    const x = 250 - (i * 100);
    const y = 150;
    createPlayer(world, {
      transform: {
        x: x,
        y: y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      velocity: {
        vx: 1 - (Math.random() * 2),
        vy: 1 - (Math.random() * 2),
      },
      isLocal: false,
      renderable: {
        layer: 1,
        spriteId: dummyCharacterTexture.id,
      },
      baseSpeed: { speed: 100 },
    })
    createFireball(game.runtime.world, {
      damage: { value: 10 },
      transform: {
        x: x,
        y: y,
        rotation: 270,
        scaleX: 1,
        scaleY: 1
      },
      velocity: {
        vx: 0,
        vy: -6,
      },
      renderable: {
        layer: 0,
        spriteId: dummyFireballTexture.id,
      },
      baseSpeed: {
        speed: 120
      }
    })
  }
  game.start();
})
