import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { createTermling, world } from "./engine.js";
import { createBrain } from "./moods.js";

export function Termling({ mood = "idle", pixel = 6, perch = false, tint = true, gaze = { x: 0, y: 0 }, onCue, className, style }) {
  const [canvas, setCanvas] = useState(null);
  const critter = useRef(null);
  const latest = useRef({ mood, gaze, perch, tint });
  const cue = useRef(onCue);

  useEffect(() => {
    cue.current = onCue;
    latest.current = { mood, gaze, perch, tint };
  });

  useEffect(() => {
    if (!canvas) return;
    const { mood: start, gaze: look, perch: sit, tint: colored } = latest.current;
    const instance = createTermling(canvas, start, look, { perch: sit, tint: colored, onCue: (name) => cue.current?.(name) });
    critter.current = instance;
    let frame = 0;
    const tick = () => {
      instance.frame(performance.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      critter.current = null;
    };
  }, [canvas]);

  useEffect(() => {
    critter.current?.feel(mood);
  }, [mood]);

  useEffect(() => {
    critter.current?.look({ x: gaze.x, y: gaze.y });
  }, [gaze.x, gaze.y]);

  return createElement("canvas", {
    ref: setCanvas,
    width: world.width,
    height: world.height,
    className,
    role: "img",
    "aria-label": `A small pixel critter, ${mood}`,
    style: { width: world.width * pixel, height: world.height * pixel, imageRendering: "pixelated", ...style },
  });
}

export function useAgentMood(initial = "idle", sleepAfter = 45000) {
  const [mood, setMood] = useState(initial);
  const [brain] = useState(() => createBrain(initial, (next) => setMood(next), sleepAfter));
  useEffect(() => () => brain.stop(), [brain]);
  const feed = useCallback((event) => brain.feed(event), [brain]);
  return [mood, feed];
}
