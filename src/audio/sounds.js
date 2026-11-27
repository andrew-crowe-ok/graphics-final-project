const SOUNDS = {
  flipper: "sounds/flipper_press.wav",
  launch: "sounds/ball_launch.wav",
  bumper: "sounds/ball_hits_bumper.wav",
  wall: "sounds/ball_hits_wall.wav",
};
const SOUND_GAP = 0.08;

export function createSoundPlayer() {
  const audio = new AudioContext();
  const soundBuffers = {};
  const lastPlayed = {};
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

  function resume() {
    if (!isHelpOpen()) audio.resume().catch(error => console.error("Could not resume audio:", error));
  }

  window.addEventListener("keydown", resume, true);
  window.addEventListener("pointerdown", resume, true);

  return {
    play(name) {
      if (!soundBuffers[name] || audio.currentTime - (lastPlayed[name] ?? -SOUND_GAP) < SOUND_GAP) return;
      lastPlayed[name] = audio.currentTime;
      const source = audio.createBufferSource();
      source.buffer = soundBuffers[name];
      source.connect(audio.destination);
      source.start();
    },
    suspend() {
      audio.suspend().catch(error => console.error("Could not suspend audio:", error));
    },
    attachHelpDialog(dialog) {
      isHelpOpen = () => dialog.open;
      dialog.addEventListener("close", resume);
    },
  };
}
