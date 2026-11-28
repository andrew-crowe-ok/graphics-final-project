export function createSecondaryView() {
  const frame = document.getElementById("secondaryView");
  const label = document.getElementById("secondaryViewLabel");
  let field = null;

  return {
    setField(index) {
      if (field === index) return;
      field = index;
      frame.hidden = index === null;
      if (index !== null) label.textContent = `BOARD ${index + 1}`;
    },
    getBounds() {
      return frame.hidden ? null : frame.getBoundingClientRect();
    },
  };
}
