import { identity } from "../math/mat4.js";
import { game, resetBall } from "../game/physics.js";
import { PLAIN_FLOOR, resetRenderTracking } from "../render/renderer.js";

const devTools = (() => {
  const DROP_POINTS = [[9.2, 29], [9.2, 60.8], [9.2, 72]];
  const state = {
    open: false,
    speed: 0.35,
    paused: false,
    stepPending: false,
    bloom: true,
    trail: true,
    shadows: true,
    palette: -1,
    mirror: 0.3,
    floor: PLAIN_FLOOR,
  };


  const btn = document.createElement("button");
  btn.id = "devBtn";
  btn.textContent = "🛠 Dev (`)";

  const panel = document.createElement("div");
  panel.id = "devPanel";
  panel.innerHTML = `
    <div class="dev-row">
      <span>Floor</span>
      <div class="dev-swatches" id="devFloors">
        <button title="Circuit (F)" style="background-image: url(textures/thumbs/circuit.png)"></button>
        <button title="Conformal (F)" style="background-image: url(textures/thumbs/conformal.png)"></button>
        <button class="active" title="Plain (F)" style="background-image: url(textures/thumbs/plain.png)"></button>
      </div>
    </div>
    <div class="dev-row">
      <span>Mirror</span>
      <input id="devMirror" type="range" min="0" max="1" step="0.1" value="0.3">
      <output id="devMirrorValue">0.3</output>
    </div>
    <div class="dev-row">
      <span>Speed</span>
      <input id="devSpeed" type="range" min="0.05" max="2" step="0.05" value="0.35">
      <output id="devSpeedValue">0.35x</output>
    </div>
    <div class="dev-btns">
      <button id="devPause">Pause (P)</button>
      <button id="devStep">+1 Frame</button>
      <button id="devSpeedReset">1x</button>
    </div>
    <div class="dev-btns">
      <button data-drop="0">L1</button>
      <button data-drop="1">L2</button>
      <button data-drop="2">L3</button>
      <button data-drop="plunger">Plunger</button>
    </div>
    <div class="dev-btns" id="devPalettes">
      <button data-palette="-1" class="active">Auto</button>
      <button data-palette="0">Blue</button>
      <button data-palette="1">Pink</button>
      <button data-palette="2">Amber</button>
    </div>
    <div class="dev-checks">
      <label><input id="devBloom" type="checkbox" checked> Bloom</label>
      <label><input id="devTrail" type="checkbox" checked> Trail</label>
      <label><input id="devShadows" type="checkbox" checked> Shadows</label>
    </div>
    <div id="devStats"></div>
  `;

  document.body.append(btn, panel);
  document.getElementById("cameraRow").appendChild(btn);

  const speedInput = panel.querySelector("#devSpeed");
  const speedOutput = panel.querySelector("#devSpeedValue");
  const pauseBtn = panel.querySelector("#devPause");
  const statsEl = panel.querySelector("#devStats");
  const paletteBtns = [...panel.querySelectorAll("#devPalettes button")];
  const floorBtns = [...panel.querySelectorAll("#devFloors button")];
  const mirrorInput = panel.querySelector("#devMirror");
  const mirrorOutput = panel.querySelector("#devMirrorValue");

  function setFloor(i) {
    state.floor = i;
    floorBtns.forEach((b, k) => b.classList.toggle("active", k === i));
  }

  function setMirror(v) {
    state.mirror = Number(v);
    mirrorOutput.textContent = state.mirror.toFixed(1);
  }

  function toggle(force) {
    state.open = typeof force === "boolean" ? force : !state.open;
    panel.classList.toggle("open", state.open);
    btn.blur();
  }

  function setSpeed(v) {
    state.speed = Math.min(2, Math.max(0.05, Number(v) || 1));
    speedInput.value = String(state.speed);
    speedOutput.textContent = `${state.speed.toFixed(2)}x`;
  }

  function setPaused(p) {
    state.paused = Boolean(p);
    pauseBtn.textContent = state.paused ? "Resume (P)" : "Pause (P)";
    pauseBtn.classList.toggle("active", state.paused);
  }

  function teleport(target) {
    if (game.balls <= 0) game.balls = 3;
    if (target === "plunger") {
      resetBall();
    } else {
      const i = Number(target);
      game.ball.p = [...DROP_POINTS[i]];
      game.ball.v = [0, 0];
      game.ball.rotation = identity();
      game.charging = false;
      game.charge = 0;
      game.field = i;
      game.state = "play";
    }
    resetRenderTracking();
  }

  btn.addEventListener("click", () => toggle());
  floorBtns.forEach((b, i) => b.addEventListener("click", () => { setFloor(i); b.blur(); }));
  mirrorInput.addEventListener("input", () => setMirror(mirrorInput.value));
  mirrorInput.addEventListener("change", () => mirrorInput.blur());
  speedInput.addEventListener("input", () => setSpeed(speedInput.value));
  speedInput.addEventListener("change", () => speedInput.blur());
  panel.querySelector("#devSpeedReset").addEventListener("click", e => { setSpeed(1); e.target.blur(); });
  pauseBtn.addEventListener("click", e => { setPaused(!state.paused); e.target.blur(); });
  panel.querySelector("#devStep").addEventListener("click", e => {
    if (!state.paused) setPaused(true);
    state.stepPending = true;
    e.target.blur();
  });

  for (const dropBtn of panel.querySelectorAll("[data-drop]")) {
    dropBtn.addEventListener("click", () => {
      teleport(dropBtn.dataset.drop);
      dropBtn.blur();
    });
  }

  for (const pBtn of paletteBtns) {
    pBtn.addEventListener("click", () => {
      state.palette = Number(pBtn.dataset.palette);
      for (const b of paletteBtns) b.classList.toggle("active", b === pBtn);
      pBtn.blur();
    });
  }

  for (const [id, key] of [["devBloom", "bloom"], ["devTrail", "trail"], ["devShadows", "shadows"]]) {
    const el = panel.querySelector(`#${id}`);
    el.addEventListener("change", () => { state[key] = el.checked; el.blur(); });
  }

  let fps = 60;

  return {
    state,
    toggle,
    setSpeed,
    setPaused,
    teleport,
    handleKey(code, down) {
      if (code === "Backquote") {
        if (down) toggle();
        return true;
      }
      if (code === "KeyF") {
        if (down) setFloor((state.floor + 1) % floorBtns.length);
        return true;
      }
      if (code === "KeyP" && (state.open || state.paused)) {
        if (down) setPaused(!state.paused);
        return true;
      }
      return false;
    },
    stepDt(dt) {
      if (!state.paused) return dt * state.speed;
      if (state.stepPending) {
        state.stepPending = false;
        return 1 / 60;
      }
      return 0;
    },
    renderOptions(simDt) {
      return {
        bloom: state.bloom,
        trail: state.trail,
        shadows: state.shadows,
        palette: state.palette,
        mirror: state.mirror,
        floor: state.floor,
        simDt,
      };
    },
    updateStats(dt, zoom) {
      if (!state.open) return;
      if (dt > 0) fps = fps * 0.9 + (1 / dt) * 0.1;
      const [x, y] = game.ball.p, [vx, vy] = game.ball.v;
      statsEl.textContent =
        `FPS ${fps.toFixed(0).padStart(3)}   Field ${game.field + 1}   ${state.paused ? "PAUSED" : `${state.speed.toFixed(2)}x`}\n` +
        `Ball (${x.toFixed(2)}, ${y.toFixed(2)})  |v| ${Math.hypot(vx, vy).toFixed(1)}\n` +
        `Cam  y:${orbitYaw.toFixed(2)} p:${orbitPitch.toFixed(2)} z:${zoom.toFixed(2)}`;
    },
  };
})();

export { devTools };
