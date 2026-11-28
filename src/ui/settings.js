const CAMERAS = [
  { name: "Table Cam", yaw: 0, pitch: 0, zoom: 1 },
  { name: "Corner Cam", yaw: -5.42, pitch: -0.328, zoom: 1.98 },
];

export function createSettings({ game, help, devTools, audio, orbitCamera, setOrbitCamera, resetTilt }) {
  const canvas = document.getElementById("glcanvas");
  const cameraBtn = document.getElementById("cameraBtn");
  const difficultySlider = document.getElementById("difficultySlider");
  const difficultyValue = document.getElementById("difficultyValue");
  const musicToggle = document.getElementById("musicToggle");
  const musicVolume = document.getElementById("musicVolume");
  const musicVolumeValue = document.getElementById("musicVolumeValue");
  const uiDock = document.getElementById("uiDock");
  const cameraRow = document.getElementById("cameraRow");
  const settingsDrawer = document.getElementById("settingsDrawer");
  const settingsBtn = document.getElementById("settingsBtn");
  const escherControls = document.getElementById("escherControls");
  let cameraIndex = 0;
  let zoom = 1;
  let screenInsets = { top: 0, bottom: 0 };

  function updateCameraLabel() {
    const nextName = CAMERAS[(cameraIndex + 1) % CAMERAS.length].name;
    cameraBtn.textContent = document.body.classList.contains("touch")
      ? `🎥 ${nextName.replace(/ Cam$/, "")}`
      : `${nextName} (C)`;
  }

  function setCamera(index) {
    cameraIndex = index;
    setOrbitCamera(CAMERAS[index].yaw, CAMERAS[index].pitch);
    zoom = CAMERAS[index].zoom;
    updateCameraLabel();
  }

  function toggleCamera() {
    setCamera((cameraIndex + 1) % CAMERAS.length);
  }

  cameraBtn.addEventListener("click", toggleCamera);
  difficultySlider.addEventListener("input", () => {
    game.difficulty = difficultySlider.value / 10;
    difficultyValue.textContent = difficultySlider.value;
  });
  difficultySlider.addEventListener("change", () => difficultySlider.blur());
  game.difficulty = difficultySlider.value / 10;

  let musicEnabled = true;
  function updateMusicToggle() {
    musicToggle.textContent = musicEnabled ? "Music On" : "Music Off";
    musicToggle.setAttribute("aria-pressed", String(musicEnabled));
  }
  musicToggle.addEventListener("click", () => {
    musicEnabled = audio.toggleMusic();
    updateMusicToggle();
  });
  musicVolume.addEventListener("input", () => {
    const volume = Number(musicVolume.value);
    audio.setMusicVolume(volume);
    musicVolumeValue.textContent = `${Math.round(volume * 100)}%`;
  });
  audio.setMusicEnabled(musicEnabled);
  audio.setMusicVolume(Number(musicVolume.value));
  updateMusicToggle();

  window.addEventListener("wheel", event => {
    if (help.open) return;
    event.preventDefault();
    zoom = Math.min(4, Math.max(0.5, zoom * Math.exp(-event.deltaY * 0.002)));
  }, { passive: false });
  canvas.addEventListener("pointerdown", event => canvas.setPointerCapture(event.pointerId));
  canvas.addEventListener("pointermove", event => {
    if (canvas.hasPointerCapture(event.pointerId)) orbitCamera(event.movementX, event.movementY);
  });
  canvas.addEventListener("dblclick", () => setCamera(cameraIndex));

  function measureInsets() {
    const rects = [...document.querySelectorAll("#hud, #cameraRow, body:not(.touch) .setting, body:not(.touch) #helpBtn, #cameraBtn, .pad, #touchLaunch, #touchTilt")]
      .map(element => element.getBoundingClientRect()).filter(rect => rect.height > 0);
    const height = window.innerHeight;
    const padsBeside = document.body.classList.contains("touch") && window.innerWidth > height;
    screenInsets = {
      top: Math.max(0, ...rects.filter(rect => rect.top < height / 2).map(rect => rect.bottom)),
      bottom: padsBeside ? 0 : Math.max(0, ...rects.filter(rect => rect.top >= height / 2).map(rect => height - rect.top)),
    };
  }
  window.addEventListener("resize", measureInsets);

  function updateDevLabel() {
    const button = document.getElementById("devBtn");
    const touch = document.body.classList.contains("touch");
    button.textContent = touch ? "🛠 Dev" : "🛠 Dev (`)";
    button.classList.toggle("active", touch && devTools.state.open);
  }

  function syncMobileControls() {
    const touch = document.body.classList.contains("touch");
    if (touch) cameraRow.insertBefore(cameraBtn, settingsBtn);
    else if (cameraBtn.parentElement !== settingsDrawer) settingsDrawer.insertBefore(cameraBtn, escherControls);
    escherControls.open = !touch;
    updateCameraLabel();
    updateDevLabel();
  }

  function setSettingsOpen(open) {
    uiDock.classList.toggle("settings-open", open);
    settingsBtn.classList.toggle("active", open);
    settingsBtn.setAttribute("aria-expanded", String(open));
    if (open && devTools.state.open) devTools.toggle(false);
    updateDevLabel();
  }

  settingsBtn.addEventListener("click", () => {
    setSettingsOpen(!uiDock.classList.contains("settings-open"));
    settingsBtn.blur();
  });
  document.getElementById("devBtn").addEventListener("click", () => {
    if (devTools.state.open) setSettingsOpen(false);
    else updateDevLabel();
  });

  function setTouchMode(on) {
    if (document.body.classList.contains("touch") === on) return;
    document.body.classList.toggle("touch", on);
    if (!on) resetTilt();
    setSettingsOpen(false);
    syncMobileControls();
    measureInsets();
  }

  document.body.classList.toggle("touch", matchMedia("(pointer: coarse)").matches);
  syncMobileControls();
  measureInsets();

  return {
    setTouchMode,
    toggleCamera,
    get camera() { return CAMERAS[cameraIndex]; },
    get zoom() { return zoom; },
    get insets() { return screenInsets; },
  };
}
