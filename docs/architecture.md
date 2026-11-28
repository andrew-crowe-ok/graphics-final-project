# Architecture map

This document is the maintained map of the Pinball codebase. Update it when moving module ownership, changing startup/render flow, or adding shader programs so people and coding agents can find the right place to work.

## Repository map

```text
index.html                     # Semantic UI shell; loads styles and one JS entry point
styles/
  main.css                     # Page layout, HUD, help, settings, and touch controls
src/
  main.js                      # Browser entry; reports asynchronous startup failures
  app.js                       # Wires subsystems, owns game lifecycle and frame loop
  audio/
    sounds.js                  # Streamed EDM loop/gain controls, SFX loading and playback throttling
  devtools/
    devtools.js                # Debug controls, teleport/pause, render options and stats
    devtools.css               # Developer panel styling
  game/
    table.js                   # Board dimensions, tuning constants, static table geometry
    physics.js                 # Game state, per-ball contacts, multiball and physics simulation
  geometry/
    meshes.js                  # Procedural cube, cylinder, torus, sphere, and flipper meshes
  input/
    keyboard.js                # Keyboard mappings and focus/visibility input release
    touch.js                   # Pointer-based flippers, launch, and tilt-stick controls
  math/
    mat4.js                    # Column-major 4x4 matrices and vector helpers
  render/
    renderer.js                # WebGL setup, fixed Table/Corner cameras, scene and post-processing
    passes/
      escher.js                # Isolated GPU conformal post-processing pass
    shaders/
      scene.vert.glsl          # Lit scene vertex stage
      scene.frag.glsl          # Materials, lights, shadows, floor sampling, reflections
      shadow.vert.glsl         # Shadow-map vertex stage
      shadow.frag.glsl         # Shadow-map depth-only fragment stage
      trail.vert.glsl          # Ball trail vertex stage
      trail.frag.glsl          # Ball trail fragment stage
      sky.vert.glsl            # Full-screen procedural sky vertex stage
      sky.frag.glsl            # Procedural sky fragment stage
      fullscreen.vert.glsl     # Shared full-screen triangle for texture post-processes
      sky-texture.frag.glsl    # Full-screen sky texture draw
      blur.frag.glsl           # Bright-pass and separable Gaussian blur
      composite.frag.glsl      # Tone mapping, bloom combination, vignette
      escher.vert.glsl         # Conformal post-process vertex stage
      escher.frag.glsl         # Conformal post-process fragment stage
  ui/
    escher-controls.js         # Conformal mapping controls and parameter state
    help.js                    # Help dialog behavior
    hud.js                     # HUD score/status updates
    secondary-view.js          # Multiball secondary-field inset overlay and bounds
    settings.js                # Camera, music, difficulty, zoom, touch layout and insets
textures/                      # Playfield, environment, and developer-preview textures
sounds/                        # Sound effects and music assets
```

## Startup and frame flow

1. `index.html` loads `styles/main.css`, `src/devtools/devtools.css`, and only `src/main.js`.
2. `src/main.js` dynamically imports `app.js` so shader/module load failures can be reported in the page.
3. `app.js` creates audio and UI controllers, connects keyboard/touch controls to game actions, starts a new game, and schedules the frame loop.
4. Each frame advances `game/physics.js` unless the help dialog is open, plays queued effects, calls `render()`, then updates HUD and developer statistics. The audio context starts the looping EDM track after a user gesture and pauses while help is open.
5. `renderer.js` owns WebGL resources and orchestrates scene rendering and post-processes. It draws every active ball with the existing sphere material/reflection treatment and maintains the existing trail effect per ball. Table Cam and Corner Cam remain the primary views; when active balls occupy different fields, a scissored secondary camera pass shows the other field in a responsive inset before the shared resolve and post-processing. The conformal effect implementation is isolated in `passes/escher.js`.

## Ownership and dependency rules

- `game/` owns gameplay rules and mutable game state, including active ball instances and their collision-trigger state. It must not depend on DOM, input, audio, or rendering.
- `table.js` owns shared playfield geometry and game/render tuning values. `physics.js` consumes that data and exports state/actions.
- `math/` and `geometry/` are reusable low-level modules with no application or DOM dependencies.
- `render/` may read game/table state and use math/geometry, but input and UI must call its public renderer controls rather than mutate renderer internals.
- `app.js` is the composition root: cross-system wiring belongs here, not in the game or renderer modules.
- UI and input modules own DOM event binding and call injected game/controller actions. Audio owns EDM/SFX asset loading, looping playback, music controls, and SFX playback.
- `ui/secondary-view.js` owns the inset frame and label; `renderer.js` obtains its bounds through the injected view interface and clips the secondary camera pass to that rectangle.
- Keep static asset URLs relative to their owning file or the page; do not use root-absolute paths, so the game works under the GitHub Pages repository subpath.

## Shader workflow

Shaders are plain `.glsl` files under `src/render/shaders/`. The renderer maps program-stage names to filenames in `SHADER_FILES` and fetches them relative to `renderer.js`; errors from HTTP loading, compilation, or linking should remain visible.

| Program | Vertex | Fragment |
| --- | --- | --- |
| Lit scene | `scene.vert.glsl` | `scene.frag.glsl` |
| Shadow depth | `shadow.vert.glsl` | `shadow.frag.glsl` |
| Ball trail | `trail.vert.glsl` | `trail.frag.glsl` |
| Procedural sky | `sky.vert.glsl` | `sky.frag.glsl` |
| Sky texture | `fullscreen.vert.glsl` | `sky-texture.frag.glsl` |
| Bloom blur | `fullscreen.vert.glsl` | `blur.frag.glsl` |
| Final composite | `fullscreen.vert.glsl` | `composite.frag.glsl` |
| Conformal effect | `escher.vert.glsl` | `escher.frag.glsl` |

Use the existing editor's GLSL language support on these files. When adding a shader, create the stage file(s), add them to `SHADER_FILES`, then connect the stages to their WebGL program in the renderer or the relevant pass module. Keep stage interfaces and uniform names aligned.

## Local verification

Serve the repository over HTTP(S), not `file://`, so native modules, fetched GLSL assets, and audio assets are permitted. Check the browser console for module, asset, shader compilation, and WebGL errors. Exercise Table Cam and Corner Cam, keyboard and touch controls, help/settings, music/SFX, multiball collisions and drains, the secondary-field inset, trails, and developer options after changing application wiring.
