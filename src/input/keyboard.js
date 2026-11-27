const FLIPPER_KEYS = {
  ArrowLeft: 0, KeyZ: 0, ShiftLeft: 0,
  ArrowRight: 1, Slash: 1, ShiftRight: 1,
};
const TILT_KEYS = { KeyA: 0, KeyD: 1, KeyS: 2, KeyW: 3 };
const PLUNGER_KEYS = new Set(["Space", "ArrowDown"]);

export function installKeyboard({
  help, setTouchMode, setFlipper, setTilt, setPlunger, toggleCamera, devTools, releaseAllInputs,
}) {
  const heldKeys = new Set();
  const hasHeldKey = predicate => [...heldKeys].some(predicate);

  function onKey(event, down) {
    if (down) setTouchMode(false);
    if (event.repeat) return;
    if (down) heldKeys.add(event.code);
    else heldKeys.delete(event.code);

    if (event.code === "KeyH" || (event.code === "Escape" && help.dialog.open)) {
      if (down) help.toggle();
    } else if (down && help.dialog.open) return;
    else if (event.code in FLIPPER_KEYS) {
      const side = FLIPPER_KEYS[event.code];
      setFlipper(side, hasHeldKey(key => FLIPPER_KEYS[key] === side));
    } else if (event.code in TILT_KEYS) {
      const direction = TILT_KEYS[event.code];
      setTilt(direction, hasHeldKey(key => TILT_KEYS[key] === direction));
    } else if (PLUNGER_KEYS.has(event.code)) {
      const held = hasHeldKey(key => PLUNGER_KEYS.has(key));
      if (down || !held) setPlunger(held);
    } else if (event.code === "KeyC") {
      if (down) toggleCamera();
    } else if (!devTools.handleKey(event.code, down)) return;
    event.preventDefault();
  }

  window.addEventListener("keydown", event => onKey(event, true));
  window.addEventListener("keyup", event => onKey(event, false));
  function release() {
    heldKeys.clear();
    releaseAllInputs();
  }

  window.addEventListener("blur", release);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) release();
  });
}
