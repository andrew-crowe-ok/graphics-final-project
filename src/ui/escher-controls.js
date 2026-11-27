const DEFAULTS = {
  angle: 0.10,
  arms: 4.0,
  strength: 0.75,
  repeat: 5.0,
  frameScale: 0.52,
  pivotX: 0.5,
  pivotY: 0.5,
};

export function installEscherControls() {
  const params = { ...DEFAULTS, enabled: true };
  const panel = document.getElementById("escherControls");
  const inputs = panel.querySelectorAll('input[type="range"]');

  panel.querySelectorAll('input[type="range"]').forEach(input => {
    input.addEventListener("input", () => {
      params[input.id] = Number(input.value);
      input.nextElementSibling.textContent = Number(input.value).toFixed(2);
    });
  });
  document.getElementById("escherEnabled").addEventListener("change", event => {
    params.enabled = event.target.checked;
  });
  document.getElementById("escherReset").addEventListener("click", () => {
    Object.assign(params, DEFAULTS, { enabled: true });
    document.getElementById("escherEnabled").checked = true;
    inputs.forEach(input => {
      input.value = DEFAULTS[input.id];
      input.nextElementSibling.textContent = Number(input.value).toFixed(2);
    });
  });
  return params;
}
