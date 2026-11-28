const SOUNDS = {
  flipper: "sounds/flipper_press.wav",
  launch: "sounds/ball_launch.wav",
  bumper: "sounds/ball_hits_bumper.wav",
  wall: "sounds/ball_hits_wall.wav",
};
const SOUND_GAP = 0.08;
const MUSIC_PATH = "sounds/edm.mp3";
const DEFAULT_MUSIC_VOLUME = 0.25;

export function createSoundPlayer() {
  const audio = new AudioContext();
  const soundBuffers = {};
  const lastPlayed = {};
  const musicElement = new Audio();
  musicElement.src = new URL(`../../${MUSIC_PATH}`, import.meta.url).href;
  musicElement.loop = true;
  musicElement.preload = "none";
  musicElement.volume = DEFAULT_MUSIC_VOLUME;
  let musicEnabled = true;
  let musicVolume = DEFAULT_MUSIC_VOLUME;
  let musicStartPending = false;
  let musicStartAttempt = 0;
  let isHelpOpen = () => false;

  for (const [name, path] of Object.entries(SOUNDS)) {
    fetch(new URL(`../../${path}`, import.meta.url))
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load sound ${path}: ${response.status}`);
        return response.arrayBuffer();
      })
      .then(data => audio.decodeAudioData(data))
      .then(buffer => { soundBuffers[name] = buffer; })
      .catch(error => console.error(error));
  }

  musicElement.addEventListener("error", () =>
    console.error(`Failed to load music ${MUSIC_PATH}:`, musicElement.error));

  function startMusic() {
    if (!musicEnabled || musicElement.error || !musicElement.paused || musicStartPending) return;
    const attempt = ++musicStartAttempt;
    musicStartPending = true;
    musicElement.play()
      .then(() => {
        if (attempt === musicStartAttempt) musicStartPending = false;
      })
      .catch(error => {
        if (attempt !== musicStartAttempt) return;
        musicStartPending = false;
        if (musicEnabled && !isHelpOpen() && error?.name !== "AbortError")
          console.error("Could not start music:", error);
      });
  }

  function resume(event) {
    if (event?.target instanceof Element && event.target.closest("#musicToggle")) return;
    if (!isHelpOpen()) {
      startMusic();
      audio.resume().then(startMusic).catch(error => console.error("Could not resume audio:", error));
    }
  }

  window.addEventListener("keydown", resume, true);
  window.addEventListener("pointerdown", resume, true);
  audio.resume().then(startMusic).catch(error => console.error("Could not resume audio:", error));

  function setMusicEnabled(enabled) {
    musicEnabled = Boolean(enabled);
    if (musicEnabled) startMusic();
    else {
      musicStartAttempt++;
      musicStartPending = false;
      musicElement.pause();
    }
  }

  function toggleMusic() {
    if (musicEnabled && (!musicElement.paused || musicStartPending)) {
      setMusicEnabled(false);
    } else {
      setMusicEnabled(true);
      audio.resume().then(startMusic).catch(error => console.error("Could not resume audio:", error));
      startMusic();
    }
    return musicEnabled;
  }

  return {
    play(name) {
      if (!soundBuffers[name] || audio.currentTime - (lastPlayed[name] ?? -SOUND_GAP) < SOUND_GAP) return;
      lastPlayed[name] = audio.currentTime;
      const source = audio.createBufferSource();
      source.buffer = soundBuffers[name];
      source.connect(audio.destination);
      source.start();
    },
    setMusicEnabled,
    toggleMusic,
    setMusicVolume(volume) {
      musicVolume = Math.max(0, Math.min(1, Number(volume)));
      musicElement.volume = musicVolume;
    },
    suspend() {
      musicStartPending = false;
      musicElement.pause();
      audio.suspend().catch(error => console.error("Could not suspend audio:", error));
    },
    attachHelpDialog(dialog) {
      isHelpOpen = () => dialog.open;
      dialog.addEventListener("close", resume);
    },
  };
}
