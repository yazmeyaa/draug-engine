import { createPlayer } from "@amber-game/game/archetypes/players";
import { AttractorObject } from "@amber-game/game/components/attrcator";
import { Position } from "@amber-game/game/components/position";
// import { Velocity } from "@amber-game/game/components/velocity";
import { createClientSideWorld } from "@amber-game/game/create-world";
import { ClientMovementDirection, ClientInputUpdate, ClientMessage } from "@amber-game/game/network/generated/client";
import { ServerMessage } from "@amber-game/game/network/generated/server";
import { type Camera, RenderingSystem } from "@amber-game/game/systems/rendering";
import { BrowserGame } from "./browser-game";

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

function worldToScreen(wx: number, wy: number): [number, number] {
  const sx = (wx - camera.x) * camera.zoom + camera.width / 2;
  const sy = (wy - camera.y) * camera.zoom + camera.height / 2;
  return [sx, sy];
}

const RADIUS_OBJECT = 6;
const RADIUS_ATTRACTOR = 12;

// const debugPanel = document.getElementById("debug-panel")!;

// Track keyboard and movement state
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

  // if (deltaTime >= 1000) {
  //   fps = Math.round((frameCount * 1000) / deltaTime);
  //   frameCount = 0;
  //   lastTime = currentTime;
  // }

  world.update(deltaTime);

  // Check for movement changes on each world update
  const { dx, dy } = calculateMovement();
  if (dx !== lastDx || dy !== lastDy) {
    sendMovement(dx, dy);
    lastDx = dx;
    lastDy = dy;
  }

  // const ids = world.query({ include: [Position, Velocity] });
  const renderingSystem = world.systems.get(RenderingSystem)
  const pStore = world.components.getStorage(Position);
  // const vStore = world.components.getComponentStorage(Velocity);
  const snapshot = renderingSystem.getSnapshot(world, camera);
  const attractorIds = world.query({ include: [Position, AttractorObject] });

  // Draw to canvas
  ctx.clearRect(0, 0, camera.width, camera.height);
  for (const id of attractorIds) {
    const ref = world.getEntityRef(id);
    const p = pStore.tryGet(ref.id);
    const [sx, sy] = worldToScreen(p.x, p.y);
    ctx.beginPath();
    ctx.arc(sx, sy, RADIUS_ATTRACTOR, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
  }
  for (const entry of snapshot) {
    ctx.beginPath();
    ctx.arc(entry.x, entry.y, RADIUS_OBJECT, 0, Math.PI * 2);
    ctx.fillStyle = "#dc2626";
    ctx.fill();
  }
})
//   const entitiesHtml = [...ids]
//     .map((id) => {
//       const ref = world.getEntityRef(id);
//       const pos = pStore.tryGet(ref.id);
//       const vel = vStore.tryGet(ref.id);
//       return `<div class="row"><span class="key">Entity ${id}</span><span class="val">x=${pos.x.toFixed(2)} y=${pos.y.toFixed(2)} vx=${vel.vx.toFixed(2)} vy=${vel.vy.toFixed(2)}</span></div>`;
//     })
//     .join("");

//   const renderItemsHtml = snapshot
//     .map((e) => `<div class="row"><span class="key">#${e.entityId}</span><span class="val">x=${e.x.toFixed(3)} y=${e.y.toFixed(3)}</span></div>`)
//     .join("");

//   debugPanel.innerHTML = `
//     <section><h3>Step ${step}</h3></section>
//     <section>
//       <h3>Performance</h3>
//       <div class="row"><span class="key">FPS</span><span class="val">${fps}</span></div>
//     </section>
//     <section>
//       <h3>Entities</h3>
//       ${entitiesHtml || "<div class=\"key\">—</div>"}
//     </section>
//     <section>
//       <h3>Camera</h3>
//       <div class="row"><span class="key">Center</span><span class="val">${camera.x.toFixed(3)}, ${camera.y.toFixed(3)}</span></div>
//       <div class="row"><span class="key">Size</span><span class="val">${camera.width} × ${camera.height}</span></div>
//       <div class="row"><span class="key">Zoom</span><span class="val">${camera.zoom}</span></div>
//     </section>
//     <section>
//       <h3>Rendering</h3>
//       ${renderItemsHtml || "<div class=\"key\">—</div>"}
//     </section>
//   `;
// });
game.start();

// WebSocket connection and keyboard input
ws = new WebSocket("ws://localhost:8090");
ws.binaryType = 'arraybuffer'

// Listen for keyboard events
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

createPlayer(world, {
  position: {
    x: 1,
    y: 2,
  },
  isLocal: true,
  renderable: {
    layer: 1,
    spriteId: '1',
  },
})

for (let i = 0; i < 5; i++) {
  createPlayer(world, {
    position: {
      x: i * 10,
      y: i * 10,
    },
    isLocal: false,
    renderable: {
      layer: 1,
      spriteId: '1',
    },
  })
}