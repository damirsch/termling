import { createTermling, world } from "./engine.js";

export { createTermling, world, tone, skins } from "./engine.js";
export { moods, words, react as moodFor, describe, createBrain, moodOfTool } from "./moods.js";
export { sound } from "./sound.js";

export function mount(target, { mood = "idle", pixel = 6, perch = false, tint = true, gaze = { x: 0, y: 0 }, onCue } = {}) {
  const canvas = target.ownerDocument.createElement("canvas");
  canvas.width = world.width;
  canvas.height = world.height;
  canvas.className = "termling";
  canvas.style.width = `${world.width * pixel}px`;
  canvas.style.height = `${world.height * pixel}px`;
  canvas.style.imageRendering = "pixelated";
  target.append(canvas);

  const critter = createTermling(canvas, mood, gaze, { perch, tint, onCue });
  let frame = 0;
  let view = canvas.ownerDocument.defaultView ?? window;
  const tick = () => {
    critter.frame(performance.now());
    view = canvas.ownerDocument.defaultView ?? window;
    frame = view.requestAnimationFrame(tick);
  };
  frame = view.requestAnimationFrame(tick);

  return {
    canvas,
    feel: critter.feel,
    look: critter.look,
    replay: critter.replay,
    destroy() {
      view.cancelAnimationFrame(frame);
      canvas.remove();
    },
  };
}
