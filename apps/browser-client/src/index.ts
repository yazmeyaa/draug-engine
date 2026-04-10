import { createPlayer } from "@amber-game/game/archetypes/players";
import { createClientSideWorld } from "@amber-game/game/create-world";
import { ClientMovementDirection, ClientInputUpdate, ClientMessage } from "@amber-game/game/network/generated/client";
import { ServerMessage } from "@amber-game/game/network/generated/server";
import { type Camera, RenderingSystem } from "@amber-game/game/systems/rendering";
import { BrowserGame } from "./browser-game";
import { Renderable } from "@amber-game/game/components/renderable";
import { Resource } from "@amber-game/resources/resource";

const world = createClientSideWorld();
world.systems.build();


let step = 0;
// let fps = 0;
let lastTime = performance.now();
let frameCount = 0;

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

  if (keysPressed["ArrowRight"]) dx += 1;
  if (keysPressed["ArrowLeft"]) dx -= 1;
  if (keysPressed["ArrowUp"]) dy -= 1;
  if (keysPressed["ArrowDown"]) dy += 1;

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

  const currentTime = performance.now();
  const deltaTime = currentTime - lastTime;
  world.update(deltaTime);

  const { dx, dy } = calculateMovement();
  if (dx !== lastDx || dy !== lastDy) {
    sendMovement(dx, dy);
    lastDx = dx;
    lastDy = dy;
  }

  const renderingSystem = world.systems.get(RenderingSystem)
  const rStore = world.components.getStorage(Renderable);
  const snapshot = renderingSystem.getSnapshot(world, camera);

  ctx.clearRect(0, 0, camera.width, camera.height);

  for (const entry of snapshot) {
    const r = rStore.tryGet(entry.entityId);
    const data = game.runtime.resources.tryGetStorage(ImageResource).tryGet(r.spriteId).getData();
    ctx.drawImage(data, entry.x - 50, entry.y - 50, 100, 100)
  }
})
game.start();

ws = new WebSocket("ws://localhost:8090");
ws.binaryType = 'arraybuffer'

window.addEventListener("keydown", (e) => {
  keysPressed[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  keysPressed[e.key] = false;
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

class ImageResource extends Resource<HTMLImageElement> { }
const imageResourceStore = game.runtime.resources.register(ImageResource, (url) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = url;
  });
});

fetch('https://picsum.photos/v2/list?limit=6')
  .then(r => r.json())
  .then(data => {
    const url = data[0].download_url;
    const res = imageResourceStore.add(url);
    res.load()
      .then(() => {
        createPlayer(world, {
          position: {
            x: 1,
            y: 2,
          },
          isLocal: true,
          renderable: {
            layer: 1,
            spriteId: res.id,
          },
        })
      })

    for (let i = 1; i < data.length; i++) {
      const res = imageResourceStore.add(data[i].download_url);
      res.load()
        .then(() => {
          createPlayer(world, {
            position: {
              x: i * 10,
              y: i * 10,
            },
            isLocal: false,
            renderable: {
              layer: 1,
              spriteId: res.id,
            },
          })
        })
    }
  })
