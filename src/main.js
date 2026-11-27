function showStartupError(error) {
  console.error("Unable to start Pinball:", error);
  const message = document.createElement("pre");
  message.textContent = `Unable to start Pinball.\n${error?.message ?? error}`;
  message.style.cssText = "position:fixed;inset:16px;z-index:100;color:#fff;background:#300;padding:16px;white-space:pre-wrap";
  document.body.append(message);
}

import("./app.js")
  .then(({ startApp }) => startApp())
  .catch(showStartupError);
