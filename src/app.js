import { createSoundPlayer } from "./audio/sounds.js";
import { installKeyboard } from "./input/keyboard.js";
import { installTouchControls } from "./input/touch.js";
import { game, newGame, setFlipper, setPlunger, setTilt, setTiltStick, stepPhysics } from "./game/physics.js";
import { devTools } from "./devtools/devtools.js";
import { orbitCamera, render, setOrbitCamera } from "./render/renderer.js";
import { createHelpDialog } from "./ui/help.js";
import { createHud } from "./ui/hud.js";
import { installEscherControls } from "./ui/escher-controls.js";
import { createSettings } from "./ui/settings.js";
import { createSecondaryView } from "./ui/secondary-view.js";

export function startApp() {
  const audio = createSoundPlayer();
  const help = createHelpDialog(audio);
  const escherParams = installEscherControls();
  const secondaryView = createSecondaryView();

  let touchControls;
  const settings = createSettings({
    game,
    help: help.dialog,
    devTools,
    audio,
    orbitCamera,
    setOrbitCamera,
    resetTilt: () => touchControls?.resetTilt(),
  });
  touchControls = installTouchControls({
    game,
    setFlipper,
    setPlunger,
    setTiltStick,
    setTouchMode: settings.setTouchMode,
  });

  function releaseAllInputs() {
    touchControls.reset();
    setFlipper(0, false);
    setFlipper(1, false);
    for (let i = 0; i < 4; i++) setTilt(i, false);
    if (game.charging) {
      game.charging = false;
      game.charge = 0;
    }
  }

  installKeyboard({
    help,
    setTouchMode: settings.setTouchMode,
    setFlipper,
    setTilt,
    setPlunger,
    toggleCamera: settings.toggleCamera,
    devTools,
    releaseAllInputs,
  });
  const updateHud = createHud(game, touchControls.sync);

  newGame();
  updateHud();

  let last;
  function frame(now) {
    const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 30));
    last = now;
    const simDt = devTools.stepDt(dt);
    if (!help.dialog.open) stepPhysics(simDt);
    for (const name of game.sounds) audio.play(name);
    game.sounds.clear();
    render(dt, settings.insets, settings.zoom, {
      ...devTools.renderOptions(simDt),
      escherParams,
      secondaryView,
    });
    updateHud();
    devTools.updateStats(dt, settings.zoom);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(now => {
    last = now;
    requestAnimationFrame(frame);
  });
}
