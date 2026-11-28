export function createHud(game, syncTouchControls) {
  const hud = document.getElementById("hud");
  return function updateHud() {
    syncTouchControls();
    const touch = document.body.classList.contains("touch");
    const status = game.state === "over" ? (touch ? "GAME OVER - tap LAUNCH" : "GAME OVER - press Space")
      : game.state === "ready" ? (touch ? "Hold LAUNCH" : "Hold Space to launch") : "";
    const multiball = game.multiballNotice > 0 ? "MULTIBALL!   " : "";
    hud.textContent = `Score ${game.score}   Lives ${game.balls}   Active ${game.activeBalls.length}\nLevel ${game.field + 1}   ${multiball}${status}`;
  };
}
