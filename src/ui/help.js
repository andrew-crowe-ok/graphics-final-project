export function createHelpDialog(audio) {
  const dialog = document.getElementById("help");
  audio.attachHelpDialog(dialog);

  function toggle() {
    if (dialog.open) dialog.close();
    else {
      dialog.showModal();
      audio.suspend();
    }
  }

  document.getElementById("helpBtn").addEventListener("click", toggle);
  return { dialog, toggle };
}
