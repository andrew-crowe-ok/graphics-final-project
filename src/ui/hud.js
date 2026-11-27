export function createHud(game, syncTouchControls) {
  const hud = document.getElementById("hud");
  return function updateHud() {
    syncTouchControls();
    const touch = document.body.classList.contains("touch");
    const status = game.state === "over" ? (touch ? "GAME OVER - tap LAUNCH" : "GAME OVER - press Space")
      : game.state === "ready" ? (touch ? "Hold LAUNCH" : "Hold Space to launch") : "";
    hud.textContent = `Score ${game.score}   Balls ${game.balls}   Level ${game.field + 1}   ${status}`;
  };
}
