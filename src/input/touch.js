function holdControl(element, onChange) {
  const fingers = new Set();
  element.addEventListener("pointerdown", event => {
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    if (fingers.size === 0) {
      onChange(true);
      element.classList.add("down");
    }
    fingers.add(event.pointerId);
  });

  const release = event => {
    if (!fingers.delete(event.pointerId) || fingers.size > 0) return;
    onChange(false);
    element.classList.remove("down");
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);

  return () => {
    for (const id of fingers) if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    fingers.clear();
    element.classList.remove("down");
  };
}

function tiltStickControl(element, knob, onChange) {
  const MAX_TRAVEL = 26;
  const INPUT_RADIUS = 32;
  const DEADZONE = 0.08;
  let activeId = null;

  function apply(clientX, clientY) {
    const rect = element.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(distance, MAX_TRAVEL);
    const kx = distance > 0 ? (dx / distance) * clamped : 0;
    const ky = distance > 0 ? (dy / distance) * clamped : 0;
    knob.style.transform = `translate(${kx.toFixed(1)}px, ${ky.toFixed(1)}px)`;

    const raw = Math.min(1, distance / INPUT_RADIUS);
    const magnitude = raw <= DEADZONE ? 0 : (raw - DEADZONE) / (1 - DEADZONE);
    const ux = distance > 0 ? (dx / distance) * magnitude : 0;
    const uy = distance > 0 ? (-dy / distance) * magnitude : 0;
    onChange(ux, uy);
  }

  function reset() {
    if (activeId !== null) {
      if (element.hasPointerCapture(activeId)) element.releasePointerCapture(activeId);
      activeId = null;
    }
    element.classList.remove("down");
    knob.style.transform = "";
    onChange(0, 0);
  }

  element.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (activeId !== null) return;
    activeId = event.pointerId;
    element.setPointerCapture(event.pointerId);
    element.classList.add("down");
    apply(event.clientX, event.clientY);
  });
  element.addEventListener("pointermove", event => {
    if (event.pointerId !== activeId) return;
    event.preventDefault();
    apply(event.clientX, event.clientY);
  });

  const release = event => {
    if (event.pointerId === activeId) reset();
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
  element.addEventListener("lostpointercapture", release);
  return reset;
}

export function installTouchControls({ game, setFlipper, setPlunger, setTiltStick, setTouchMode }) {
  const touchRoot = document.getElementById("touch");
  const flipperControl = index => down => {
    setFlipper(index, down);
    if (down) navigator.vibrate?.(8);
  };
  const cancelLeft = holdControl(document.getElementById("touchLeft"), flipperControl(0));
  const cancelRight = holdControl(document.getElementById("touchRight"), flipperControl(1));
  const cancelLaunch = holdControl(document.getElementById("touchLaunch"), setPlunger);
  const resetTilt = tiltStickControl(
    document.getElementById("touchTilt"),
    document.getElementById("touchTiltKnob"),
    setTiltStick,
  );

  let touchPlaying = null;
  function sync() {
    const playing = game.state === "play";
    if (playing === touchPlaying) return;
    touchPlaying = playing;
    touchRoot.classList.toggle("playing", playing);
    if (playing) cancelLaunch();
    else resetTilt();
  }

  function reset() {
    cancelLeft();
    cancelRight();
    cancelLaunch();
    resetTilt();
  }

  window.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch") setTouchMode(true);
  }, true);
  window.addEventListener("contextmenu", event => event.preventDefault());
  return { reset, sync, resetTilt };
}
