import { mixLch, shift, toHex, toLch } from "./color.js";
import { bang, bell, drop, glyphs, hint, puffs, question, spark, spiral, twinkle, zees } from "./sprites.js";
export const world = { width: 72, height: 62, floor: 54 };
export const tone = {
  body: "#d77757",
  ink: "#141413",
  shadow: "#ece7de",
  glassOver: "#eaa792",
  glass: "#dcebf7",
  rim: "#8f9cc0",
  handle: "#b58a63",
  glint: "#ffffff",
  paper: "#f8eed8",
  roll: "#e6d1a5",
  rollShade: "#cdb07c",
  scribble: "#b9a98a",
  scribbleHot: "#e59a7d",
  board: "#d4cbee",
  boardEdge: "#b8acdc",
  key: "#f8f6fd",
  keyLit: "#f6b9a2",
  dots: "#d6cec1",
  hint: "#9d89e0",
  bang: "#f0a93a",
  bell: "#f5c94f",
  bellShade: "#dda931",
  clapper: "#9b7424",
  ring: "#e9b949",
  sweat: "#86c8f0",
  puff: "#e3ddd2",
  steam: "#d9d1c6",
  halo: "#f6d77c",
  zee: "#9ba8c9",
  star: "#f2c04a",
  confetti: ["#f59bb8", "#7fc0ec", "#94d184", "#f5c84f", "#ad97ea", "#f6a879"],
  code: ["#6fb2e8", "#86c977", "#ef94b4", "#eab443", "#a28ce6", "#f19c6c"],
};
const rest = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  sink: 0,
  lean: 0,
  eyeX: 0,
  eyeY: 0,
  open: 1,
  leftOut: 0,
  leftDown: 0,
  rightOut: 0,
  rightDown: 0,
  foot0: 0,
  foot1: 0,
  foot2: 0,
  foot3: 0,
  spin: 0,
};
const fields = Object.keys(rest);
const allProps = ["spark", "scroll", "lens", "keyboard", "sweat", "question", "bell", "bang", "stars"];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const hash = (seed) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const arc = (t, start, length) => Math.sin(Math.PI * clamp((t - start) / length, 0, 1));
const ease = (k) => 1 - Math.pow(1 - k, 3);
const pop = (k) => {
  const c = 2.2;
  const value = k - 1;
  return 1 + (c + 1) * value * value * value + c * value * value;
};
function blink(now, every = 4200) {
  const slot = Math.floor(now / every);
  const phase = now - slot * every - hash(slot) * (every - 700);
  const second = hash(slot + 91) > 0.75 ? 260 : -1000;
  const close = (offset) => {
    const local = phase - offset;
    if (local < 0 || local > 150) return 1;
    return local < 50 || local > 100 ? 0.5 : 0;
  };
  return Math.min(close(0), close(second));
}
function pose(patch) {
  return { ...rest, ...patch };
}
const aims = {
  idle: ({ now }) => {
    const breath = Math.sin((now / 2800) * Math.PI * 2);
    const look = hash(Math.floor(now / 2800) + 7);
    return {
      pose: pose({ h: breath < -0.35 ? -1 : 0, eyeX: look < 0.28 ? -2 : look > 0.74 ? 2 : 0, eyeY: look > 0.9 ? -1 : 0, open: blink(now) }),
      face: "open",
      props: [],
    };
  },
  listening: ({ t, now, gaze, from }) => {
    const startle = from === "sleeping";
    const height = startle ? 7 : 3;
    const length = startle ? 460 : 320;
    const crouch = t < 80;
    const air = arc(t, 80, length);
    return {
      pose: pose({
        y: -height * air,
        h: crouch ? -2 : 1,
        w: crouch ? 2 : air > 0.2 ? -1 : 0,
        lean: t > 80 + length ? gaze.x : 0,
        eyeX: 2 * gaze.x,
        eyeY: gaze.y > 0 ? 1 : 0,
        open: t < 900 ? 1 : blink(now),
        leftDown: air > 0.2 ? -4 : -2,
        rightDown: air > 0.2 ? -4 : -2,
      }),
      face: t < 800 ? "wide" : "open",
      props: t < 1300 ? ["bang"] : [],
    };
  },
  thinking: ({ t, now }) => {
    const side = Math.floor(t / 1500) % 2 ? 1 : -1;
    const sway = Math.sin((now / 2100) * Math.PI * 2);
    return {
      pose: pose({ eyeX: side, eyeY: -2, h: sway > 0.55 ? -1 : 0, open: blink(now, 2800), rightDown: -6 + (Math.floor(t / 420) % 2), rightOut: 1 }),
      face: "open",
      props: ["spark"],
    };
  },
  reading: ({ t, now }) => {
    const line = 1300;
    const progress = (t % line) / line;
    const eyeX = progress < 0.84 ? clamp(Math.floor(-1 + progress * 3.6), -1, 1) : -1;
    return {
      pose: pose({ eyeY: 1, eyeX, h: progress > 0.86 ? -1 : 0, open: blink(now, 4200), leftDown: 1, rightDown: 1, leftOut: -1, rightOut: -1 }),
      face: "open",
      props: ["scroll"],
    };
  },
  searching: ({ t, now }) => {
    const scan = Math.sin((t / 1500) * Math.PI * 2);
    return {
      pose: pose({ eyeX: Math.round(scan), open: blink(now, 4200), rightDown: 2, rightOut: 0, h: Math.abs(scan) > 0.95 ? -1 : 0 }),
      face: "open",
      props: ["lens"],
    };
  },
  writing: ({ t, now, gaze }) => {
    const slot = Math.floor(t / 115);
    const hand = hash(slot * 3.1) < 0.5 ? 0 : 1;
    const press = t % 115 < 70;
    const glance = t % 2600 > 2050;
    return {
      pose: pose({
        eyeY: glance ? 0 : 1,
        eyeX: glance ? 2 * gaze.x : hand ? 1 : -1,
        open: blink(now, 4200),
        leftDown: 2 + (hand === 0 && press ? 1 : 0),
        rightDown: 2 + (hand === 1 && press ? 1 : 0),
        leftOut: -1,
        rightOut: -1,
        h: press && hash(slot) > 0.7 ? -1 : 0,
      }),
      face: "open",
      props: ["keyboard"],
    };
  },
  running: ({ t, now, gaze }) => {
    const dart = hash(Math.floor(t / 340) * 1.7);
    const tap = t % 300 < 150;
    const shiver = hash(Math.floor(now / 70)) > 0.82;
    return {
      pose: pose({
        x: shiver ? 1 : 0,
        h: -1,
        eyeX: dart < 0.55 ? 2 * gaze.x || 2 : dart < 0.8 ? 0 : -1,
        eyeY: gaze.y > 0 && dart < 0.55 ? 1 : 0,
        open: blink(now, 2100),
        foot3: tap ? 2 : 0,
        leftDown: 1,
        rightDown: tap ? 0 : 1,
      }),
      face: "open",
      props: ["sweat"],
    };
  },
  error: ({ t, now }) => {
    const shake = t > 90 && t < 420 ? ([1, -1, 1, -1, 1, -1, 0][Math.floor((t - 90) / 50)] ?? 0) : 0;
    const sigh = t > 1250 && t < 1900;
    return {
      pose: pose({
        y: t < 90 ? -2 : 0,
        x: shake,
        lean: t > 380 ? -2 : 0,
        h: sigh ? -1 : 0,
        open: t < 1000 ? 1 : blink(now, 2800),
        rightDown: t > 500 ? -9 + (Math.floor(t / 150) % 2) : 0,
        rightOut: t > 500 ? -1 + (Math.floor(t / 150) % 2) : 0,
      }),
      face: t < 380 ? "wide" : "confused",
      props: t > 220 ? ["question"] : [],
    };
  },
  waiting: ({ t, now, gaze }) => {
    const wave = Math.floor(t / 180) % 2;
    const glance = t % 1900 > 1350;
    return {
      pose: pose({
        y: t % 1000 < 110 ? -1 : 0,
        eyeX: glance ? 2 * gaze.x : 0,
        eyeY: glance && gaze.y > 0 ? 1 : 0,
        open: blink(now, 2800),
        leftDown: wave ? -8 : -9,
        leftOut: wave ? 3 : 1,
        foot3: t % 240 < 120 ? 2 : 0,
      }),
      face: "open",
      props: ["bell"],
    };
  },
  compacting: ({ t }) => {
    const cycle = ((t + 1300) % 2100) / 2100;
    const turning = t > 500 && cycle < 0.4;
    const k = turning ? cycle / 0.4 : 0;
    const spin = k * k * (3 - 2 * k);
    const squeeze = turning ? 0 : 0.5 + 0.5 * Math.sin((t / 700) * Math.PI * 2 - Math.PI / 2);
    return {
      pose: pose({
        h: -Math.round(4 * squeeze),
        w: Math.round(3 * squeeze),
        lean: turning ? 0 : Math.round(2 * Math.sin((t / 1050) * Math.PI * 2)),
        leftDown: turning ? -3 : -Math.round(2 * squeeze),
        rightDown: turning ? -3 : -Math.round(2 * squeeze),
        y: turning ? -Math.round(2 * Math.sin(Math.PI * k)) : 0,
        spin,
      }),
      face: "spiral",
      props: ["stars"],
    };
  },
  done: ({ t }) => {
    const first = arc(t, 140, 440);
    const second = arc(t, 700, 340);
    const air = Math.max(first, second);
    const landing = (t > 580 && t < 700) || (t > 1040 && t < 1140);
    const dance = t > 1140;
    const beat = Math.floor((t - 1140) / 360) % 2;
    const up = -8;
    return {
      pose: pose({
        y: -(9 * first + 5 * second),
        h: t < 140 || landing ? -2 : air > 0.15 ? 2 : dance ? 1 : 0,
        w: t < 140 || landing ? 2 : air > 0.15 ? -2 : 0,
        sink: t < 140 ? 1 : 0,
        lean: dance ? (beat ? 1 : -1) : 0,
        open: 1,
        leftDown: dance ? (beat ? up : 0) : t < 140 ? 1 : up,
        rightDown: dance ? (beat ? 0 : up) : t < 140 ? 1 : up,
        leftOut: dance ? (beat ? 2 : 0) : t < 140 ? 0 : 2,
        rightOut: dance ? (beat ? 0 : 2) : t < 140 ? 0 : 2,
        foot0: dance && !beat ? 1 : 0,
        foot3: dance && beat ? 1 : 0,
      }),
      face: t < 1140 ? "squint" : "happy",
      props: [],
    };
  },
  sleeping: ({ t, now }) => {
    if (t < 800) {
      return { pose: pose({ h: 2, w: -1, leftDown: -8, rightDown: -8, leftOut: 2, rightOut: 2, open: 1 }), face: "squint", props: [] };
    }
    if (t < 1500) {
      return { pose: pose({ h: 0, open: t < 1150 ? 0.5 : 1, eyeY: 1 }), face: "open", props: [] };
    }
    if (t < 2200) {
      const nod = arc(t, 1500, 700);
      return { pose: pose({ h: -1, sink: 1 + nod, open: nod > 0.5 ? 0 : 0.5, eyeY: 1, leftDown: 1, rightDown: 1 }), face: "open", props: [] };
    }
    const breath = Math.sin((now / 4200) * Math.PI * 2);
    return {
      pose: pose({ h: breath > 0 ? -1 : -2, w: breath > 0 ? 0 : 1, sink: 2, leftDown: 1, rightDown: 1 }),
      face: "closed",
      props: [],
    };
  },
};
function mix(from, to, k) {
  const out = { ...to };
  for (const field of fields) out[field] = from[field] + (to[field] - from[field]) * k;
  return out;
}
function shape(p, perch) {
  const turn = Math.cos(p.spin * Math.PI * 2);
  const bw = Math.max(4, Math.round((24 + p.w) * Math.max(0.17, Math.abs(turn))));
  const bh = Math.round(16 + p.h);
  const legs = perch ? 4 : Math.max(1, Math.round(4 - p.sink));
  const bottom = world.floor - 1 + Math.round(p.y) - (perch ? 0 : legs);
  const top = bottom - bh + 1;
  const left = Math.round(world.width / 2 + p.x - bw / 2);
  return { bw, bh, legs, bottom, top, left, turn };
}
export const skins = {
  error: "#d24e40",
  running: "#f3bd9e",
  waiting: "#ed9d3a",
  compacting: "#9dbb63",
  done: "#f0c13e",
  sleeping: "#8a7ebe",
};
const brand = toLch(tone.body);
const halo = toLch(tone.halo);
const tints = Object.fromEntries(Object.entries(skins).map(([name, hex]) => [name, toLch(hex)]));
const swinging = ["idle", "thinking", "reading", "searching", "writing", "listening"];
const downcast = ["idle", "reading", "searching", "writing", "running", "waiting", "error"];
const snapped = ["x", "y", "w", "h", "sink", "lean", "eyeX", "eyeY", "leftOut", "leftDown", "rightOut", "rightDown", "foot0", "foot1", "foot2", "foot3"];
export function createTermling(canvas, initial, initialGaze, options = {}) {
  const ctx = canvas.getContext("2d");
  const snap = options.snap ?? 1;
  const above = (offset) => Math.round(offset * (options.float ?? 1));
  const perch = options.perch ?? false;
  const seed = options.seed ?? 0;
  const spread = options.spread ?? 1;
  const tint = options.tint ?? true;
  const skinOf = (next) => (tint ? (tints[next] ?? brand) : brand);
  const period = options.period ?? 0;
  const beat = period / Math.max(1, options.beats ?? 1);
  const clock = () => (options.clock ? options.clock() : performance.now()) + seed;
  const start = clock() - period;
  let warming = false;
  const cue = (name) => {
    if (!warming) options.onCue?.(name);
  };
  let draws = 0;
  const random = () => hash(++draws * 1.618 + 0.37);
  let gaze = initialGaze;
  let mood = initial;
  let from = initial;
  let since = start - (initial === "sleeping" ? 6000 : 0);
  let lastBeat = period ? Math.floor(start / beat) : 0;
  let skinFrom = skinOf(initial);
  let skinTo = skinFrom;
  let skinSince = start;
  let lastSteam = -1;
  let glow = initial === "done" && tint ? 1 : 0;
  const skinAt = (now) => {
    const k = clamp((now - skinSince) / 500, 0, 1);
    return mixLch(skinFrom, skinTo, k * k * (3 - 2 * k));
  };
  let held = aims[initial]({ t: 6000, now: since, gaze, from }).pose;
  let shown = held;
  let faceBefore = aims[initial]({ t: 6000, now: since, gaze, from }).face;
  let last = start;
  let lastSlot = -1;
  let lastZee = 0;
  let puffed = false;
  let burst = 0;
  let lastRing = -1;
  let lastBreath = 0;
  let lastSpin = -1;
  const presence = Object.fromEntries(allProps.map((prop) => [prop, 0]));
  const shownAt = Object.fromEntries(allProps.map((prop) => [prop, 0]));
  const particles = [];
  const restart = (now) => {
    faceBefore = aims[mood]({ t: now - since, now, gaze, from }).face;
    held = shown;
    since = now;
    lastSlot = -1;
    puffed = false;
    burst = 0;
    lastRing = -1;
    lastSpin = -1;
    lastSteam = -1;
    draws = 0;
  };
  const feel = (next, now = clock()) => {
    if (next === mood) return;
    if (mood === "sleeping") for (const particle of particles) if (particle.kind === "zee") particle.life = Math.min(particle.life, now - particle.born + 160);
    if (mood === "compacting") cue("quiet");
    skinFrom = skinAt(now);
    skinTo = skinOf(next);
    skinSince = now;
    restart(now);
    from = mood;
    mood = next;
    if (next === "listening") cue(from === "sleeping" ? "wake" : "blip");
    if (next === "error") cue("boing");
    if (next === "sleeping") cue("yawn");
    if (next === "compacting") cue("whirr");
  };
  const replay = (now = clock()) => {
    restart(now);
    from = mood === "sleeping" ? "idle" : mood;
  };
  const spawn = (particle, now) => particles.push({ ...particle, born: now });
  const emit = (now, t, s) => {
    if (mood === "writing" && presence.keyboard > 0.8) {
      const slot = Math.floor(t / 115);
      if (slot !== lastSlot) {
        lastSlot = slot;
        cue("key");
        if (hash(slot * 5.3) < 0.62) {
          const hand = hash(slot * 3.1) < 0.5 ? 0 : 1;
          const x = hand ? s.left + s.bw + 2 + Math.round(hash(slot) * 3) : s.left - 6 - Math.round(hash(slot) * 3);
          spawn(
            {
              kind: "glyph",
              x,
              y: world.floor - 12,
              vx: (hand ? 1 : -1) * (3 + hash(slot + 2) * 6),
              vy: -16 - hash(slot + 4) * 8,
              life: (1100 + hash(slot + 6) * 400) * spread,
              color: tone.code[Math.floor(hash(slot + 8) * tone.code.length)],
              shape: Math.floor(hash(slot + 9) * glyphs.length),
            },
            now,
          );
        }
      }
    }
    if (mood === "sleeping" && t > 2200) {
      const breath = Math.sin((now / 4200) * Math.PI * 2);
      if (breath > 0 && lastBreath <= 0) cue("snore");
      lastBreath = breath;
    }
    if (mood === "waiting" && t > 150) {
      const ring = Math.floor((t - 150) / 1400);
      if (ring !== lastRing) {
        lastRing = ring;
        cue("bell");
      }
    }
    if (mood === "compacting") {
      const spin = Math.floor((t + 1300) / 2100);
      if (t > 500 && (t + 1300) % 2100 < 840 && spin !== lastSpin) {
        lastSpin = spin;
        cue("spin");
      }
    }
    if (mood === "sleeping" && t > 2200 && Math.floor(now / 1200) !== lastZee) {
      lastZee = Math.floor(now / 1200);
      spawn({ kind: "zee", x: s.left + s.bw - 4, y: s.top - 3, vx: 3.4, vy: -6.5, life: 3000, color: tone.zee, shape: 0 }, now);
    }
    if (mood === "error" && tint && t > 350) {
      const slot = Math.floor((t - 350) / 380);
      if (slot !== lastSteam) {
        lastSteam = slot;
        const side = slot % 2;
        spawn({ kind: "steam", x: side ? s.left + s.bw - 10 : s.left + 5, y: s.top - 3, vx: side ? 2.5 : -2.5, vy: -9, life: 720, color: tone.steam, shape: 0 }, now);
      }
    }
    if (mood === "error" && t > 1250 && !puffed) {
      puffed = true;
      cue("sigh");
      spawn({ kind: "puff", x: s.left - 4, y: s.top + 5, vx: -9, vy: -2.5, life: 900, color: tone.puff, shape: 0 }, now);
    }
    const bursts = [320, 820];
    if (mood === "done" && burst < bursts.length && t > bursts[burst]) {
      const count = Math.round((burst ? 18 : 34) * (0.5 + spread / 2));
      if (!burst) cue("fanfare");
      for (let index = 0; index < count; index++) {
        const angle = -Math.PI / 2 + (random() - 0.5) * Math.PI * 1.25;
        const speed = (28 + random() * 32) * spread;
        spawn(
          {
            kind: "confetti",
            x: s.left + s.bw / 2 + (random() - 0.5) * 10,
            y: s.top - 1,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1600 + random() * 900,
            color: tone.confetti[index % tone.confetti.length],
            shape: Math.floor(random() * 3),
          },
          now,
        );
      }
      burst++;
    }
  };
  const draw = (now, t, aim, k) => {
    const p = snap > 1 ? { ...shown, ...Object.fromEntries(snapped.map((field) => [field, Math.round(shown[field] / snap) * snap])) } : shown;
    const s = shape(p, perch);
    const { bw, bh, left, top, bottom, legs, turn } = s;
    const span = Math.abs(turn);
    const shear = (row) => Math.round(p.lean * clamp((bottom - row) / bh, 0, 1));
    const fill = (x, y, w, h, color, bent = true) => {
      if (w <= 0 || h <= 0) return;
      ctx.fillStyle = color;
      for (let row = y; row < y + h; row++) ctx.fillRect(x + (bent ? shear(row) : 0), row, w, 1);
    };
    const stamp = (grid, x, y, colors, scale = 1, flip = false, bent = false) => {
      const gh = grid.length;
      const gw = grid[0].length;
      const sw = Math.max(1, Math.round(gw * scale));
      const sh = Math.max(1, Math.round(gh * scale));
      if (scale < 0.15) return;
      const ox = x + Math.round((gw - sw) / 2);
      const oy = y + Math.round((gh - sh) / 2);
      for (let j = 0; j < sh; j++) {
        const row = grid[Math.min(gh - 1, Math.floor(((j + 0.5) / sh) * gh))];
        for (let i = 0; i < sw; i++) {
          let column = Math.min(gw - 1, Math.floor(((i + 0.5) / sw) * gw));
          if (flip) column = gw - 1 - column;
          const cell = row[column];
          if (cell === ".") continue;
          const color = typeof colors === "string" ? colors : colors[cell];
          if (color) fill(ox + i, oy + j, 1, 1, color, bent);
        }
      }
    };
    ctx.clearRect(0, 0, world.width, world.height);
    const lift = clamp(-Math.round(p.y), 0, 14);
    const cx = Math.round(world.width / 2 + p.x);
    const shade = Math.max(8, Math.round(24 + p.w) + 4 - lift);
    if (!perch) fill(cx - Math.round(shade / 2), world.floor - 1, shade, 1, tone.shadow, false);
    const orbit = (index) => {
      const angle = (now / 1050) * Math.PI * 2 + (index * Math.PI * 2) / 3;
      const radius = presence.stars;
      return {
        x: Math.round(cx + Math.cos(angle) * 16 * radius - 2),
        y: Math.round(top - 4 + Math.sin(angle) * 3 * radius),
        back: Math.sin(angle) < 0,
        frame: Math.floor(now / 175 + index) % 2,
      };
    };
    if (presence.stars > 0.05) {
      for (let index = 0; index < 3; index++) {
        const star = orbit(index);
        if (star.back) stamp(twinkle[star.frame], star.x, star.y, tone.star, presence.stars);
      }
    }
    const sway = perch && swinging.includes(mood) ? Math.sin((now / 840) * Math.PI * 2) : 0;
    const feet = [p.foot0 + (sway > 0.35 ? 1 : 0), p.foot1, p.foot2, p.foot3 + (sway < -0.35 ? 1 : 0)].map((value) => Math.round(value));
    const settled = clamp((now - skinSince) / 500, 0, 1);
    const skin = mood === "error" && tint ? shift(skinAt(now), 0.03 * Math.sin((now / 700) * Math.PI * 2) * settled) : skinAt(now);
    const body = toHex(skin);
    const glassOver = toHex(shift(skin, 0.1, 0.65));
    if (glow > 0.02) {
      const pulse = 0.8 + 0.2 * Math.sin((now / 1050) * Math.PI * 2);
      ctx.globalAlpha = 0.24 * glow * pulse;
      const outer = toHex(shift(halo, 0.04, 0.8));
      fill(left - 2, top - 1, bw + 4, bh + 2, outer);
      fill(left - 1, top - 2, bw + 2, bh + 4, outer);
      ctx.globalAlpha = 0.5 * glow * pulse;
      fill(left - 1, top - 1, bw + 2, bh + 2, tone.halo);
      ctx.globalAlpha = 1;
    }
    const stance = bw >= 16 ? [2, 6, bw - 8, bw - 4] : [Math.round(bw * 0.25) - 1, Math.round(bw * 0.75) - 1];
    stance.forEach((x, index) => fill(left + x, bottom + 1, 2, Math.max(0, legs - (feet[index] ?? 0)), body));
    fill(left, top, bw, bh, body);
    const eyeTop = top + Math.round((4 * bh) / 16) + Math.round(clamp(p.eyeY, -2, 2));
    const eyeShift = Math.round(clamp(p.eyeX, -2, 2));
    const eyeLeft = left + Math.round(4 * span) + eyeShift;
    const eyeRight = left + bw - Math.round(6 * span) + eyeShift;
    const facing = turn > 0.35;
    const face = k < 0.5 && t < 260 ? faceBefore : aim.face;
    const open = t < 260 && faceBefore !== aim.face ? Math.min(p.open, Math.abs(k - 0.5) < 0.25 ? 0 : 0.5) : p.open;
    const eye = (x, side, y = eyeTop, paint = fill) => {
      if (open < 0.3 && face !== "closed") {
        paint(x, y + 2, 2, 1, tone.ink);
        return;
      }
      if (face === "open" || face === "wide" || (face === "confused" && side === 0)) {
        if (open < 0.75) paint(x, y + 1, 2, 2, tone.ink);
        else if (face === "wide") paint(x, y - 1, 2, 5, tone.ink);
        else paint(x, y, 2, 4, tone.ink);
      } else if (face === "confused") {
        paint(x, y + 1, 2, 2, tone.ink);
      } else if (face === "happy") {
        paint(x, y + 1, 2, 1, tone.ink);
        paint(x - 1, y + 2, 1, 1, tone.ink);
        paint(x + 2, y + 2, 1, 1, tone.ink);
      } else if (face === "closed") {
        paint(x - 1, y + 3, 4, 1, tone.ink);
      } else if (face === "squint") {
        const rows = side === 0 ? [-1, 0, 0, -1] : [0, -1, -1, 0];
        rows.forEach((offset, row) => paint(x + offset, y + row, 2, 1, tone.ink));
      } else if (face === "spiral") {
        const frame = Math.floor(now / 105) % 4;
        stamp(spiral[side ? (4 - frame) % 4 : frame], side ? x - 1 : x - 2, y - 1, tone.ink, 1, side === 1, true);
      }
    };
    let lens = null;
    if (presence.lens > 0.05) {
      const settle = 1 - presence.lens;
      const sway = Math.round(Math.sin((t / 3000) * Math.PI * 2));
      lens = { x: left + bw - 6 + shear(eyeTop + 2) + sway + Math.round(settle * 8), y: eyeTop + 2 + Math.round(settle * 10) };
    }
    const inGlass = (x, y) => lens && (x - lens.x) ** 2 + (y - lens.y) ** 2 <= 14;
    if (facing && !lens) {
      eye(eyeLeft, 0);
      eye(eyeRight, 1);
    } else if (facing) {
      const outside = (x, y, w, h, color) => {
        for (let row = y; row < y + h; row++) for (let column = x; column < x + w; column++) if (!inGlass(column + shear(row), row)) fill(column, row, 1, 1, color);
      };
      eye(eyeLeft, 0, eyeTop, outside);
      eye(eyeRight, 1, eyeTop, outside);
    }
    if (presence.scroll > 0.05) {
      const drop = Math.round((1 - presence.scroll) * 8);
      const armTop = top + Math.round((8 * bh) / 16) + drop;
      const line = Math.floor(t / 1300);
      fill(left - 1, armTop + 1, bw + 2, 7, tone.paper);
      for (let row = 0; row < 3; row++) {
        let x = left + 2;
        let segment = 0;
        while (x < left + bw - 2) {
          const length = 1 + Math.floor(hash(line * 7 + row * 13 + segment) * 4);
          const hot = row === 1 && segment === 2;
          fill(x, armTop + 2 + row * 2, Math.min(length, left + bw - 2 - x), 1, hot ? tone.scribbleHot : tone.scribble);
          x += length + 1;
          segment++;
        }
      }
      fill(left - 4, armTop, 3, 9, tone.roll);
      fill(left - 2, armTop, 1, 9, tone.rollShade);
      fill(left + bw + 1, armTop, 3, 9, tone.roll);
      fill(left + bw + 1, armTop, 1, 9, tone.rollShade);
    }
    if (lens) {
      for (let y = lens.y - 5; y <= lens.y + 5; y++) {
        for (let x = lens.x - 5; x <= lens.x + 5; x++) {
          const d = (x - lens.x) ** 2 + (y - lens.y) ** 2;
          const overBody = x >= left + shear(y) && x < left + bw + shear(y) && y >= top && y <= bottom;
          if (d <= 14) fill(x, y, 1, 1, overBody ? glassOver : tone.glass, false);
        }
      }
      const glassFill = (x, y, w, h, color) => {
        for (let row = y; row < y + h; row++) for (let column = x; column < x + w; column++) if (inGlass(column, row)) fill(column, row, 1, 1, color, false);
      };
      const big = (ex) => {
        const centerX = ex + shear(eyeTop + 2) + 1;
        if (Math.abs(centerX - lens.x) <= 2) {
          if (open < 0.3) glassFill(centerX - 2, eyeTop + 2, 3, 2, tone.ink);
          else glassFill(centerX - 2, eyeTop - 1, 3, open < 0.75 ? 4 : 7, tone.ink);
        } else {
          const plain = (x, y, w, h, color) => {
            for (let row = y; row < y + h; row++) for (let column = x; column < x + w; column++) if (inGlass(column + shear(row), row)) fill(column, row, 1, 1, color);
          };
          eye(ex, ex === eyeLeft ? 0 : 1, eyeTop, plain);
        }
      };
      big(eyeLeft);
      big(eyeRight);
      for (let y = lens.y - 5; y <= lens.y + 5; y++) {
        for (let x = lens.x - 5; x <= lens.x + 5; x++) {
          const d = (x - lens.x) ** 2 + (y - lens.y) ** 2;
          if (d > 14 && d <= 27) fill(x, y, 1, 1, tone.rim, false);
        }
      }
      fill(lens.x - 2, lens.y - 2, 1, 1, tone.glint, false);
      fill(lens.x - 1, lens.y - 3, 1, 1, tone.glint, false);
      const armX = left + bw + Math.round(p.rightOut) + shear(top + 8) + 1;
      const armY = top + Math.round((8 * bh) / 16) + Math.round(p.rightDown) + 1;
      const startX = lens.x + 3;
      const startY = lens.y + 3;
      const steps = Math.max(Math.abs(armX - startX), Math.abs(armY - startY), 1);
      for (let index = 0; index <= steps; index++) {
        const x = Math.round(startX + ((armX - startX) * index) / steps);
        const y = Math.round(startY + ((armY - startY) * index) / steps);
        fill(x, y, 2, 2, tone.handle, false);
      }
    }
    if (presence.keyboard > 0.05) {
      const rise = Math.round((1 - presence.keyboard) * 9);
      const kx = cx - 15;
      const ky = world.floor - 6 + rise;
      const clip = (x, y, w, h, color) => {
        const end = Math.min(y + h, world.floor + 1);
        if (end > y) fill(x, y, w, end - y, color, false);
      };
      clip(kx, ky, 30, 6, tone.board);
      clip(kx, ky + 5, 30, 1, tone.boardEdge);
      const slot = Math.floor(t / 115);
      const hand = hash(slot * 3.1) < 0.5 ? 0 : 1;
      const pressing = t % 115 < 70 && mood === "writing";
      for (let row = 0; row < 2; row++) {
        for (let key = 0; key < 9; key++) {
          const x = kx + 2 + key * 3;
          const lit = pressing && row === 0 && ((hand === 0 && key === 1 + Math.floor(hash(slot) * 3)) || (hand === 1 && key === 5 + Math.floor(hash(slot) * 3)));
          clip(x, ky + 1 + row * 2, 2, 1, lit ? tone.keyLit : tone.key);
        }
      }
      clip(kx + 8, ky + 4, 14, 1, tone.key);
    }
    const armTop = top + Math.round((8 * bh) / 16);
    const arm = (side, out, down) => {
      const baseX = side ? left + bw : left - 4;
      const endX = baseX + (side ? 1 : -1) * Math.round(out);
      const endY = armTop + Math.round(down);
      const steps = Math.max(Math.abs(endX - baseX), Math.abs(endY - armTop));
      fill(baseX, armTop, 4, 4, body);
      for (let index = 1; index <= steps; index++) {
        const x = Math.round(baseX + ((endX - baseX) * index) / steps);
        const y = Math.round(armTop + ((endY - armTop) * index) / steps);
        if (steps <= 1) fill(x, y, 4, 4, body);
        else fill(x + (side ? 0 : 1), y + (down < 0 ? 0 : 1), 3, 3, body);
      }
    };
    if (span > 0.45) {
      arm(0, p.leftOut, p.leftDown);
      arm(1, p.rightOut, p.rightDown);
    }
    if (presence.stars > 0.05) {
      for (let index = 0; index < 3; index++) {
        const star = orbit(index);
        if (!star.back) stamp(twinkle[star.frame], star.x, star.y, tone.star, presence.stars);
      }
    }
    const age = (prop) => now - shownAt[prop];
    const scaleOf = (prop) => (presence[prop] >= 1 ? 1 : aim.props.includes(prop) ? pop(presence[prop]) : presence[prop]);
    if (presence.spark > 0.05) {
      const ax = left + bw - 3;
      const grow = age("spark");
      const leaving = !aim.props.includes("spark");
      if (leaving || grow > 0) fill(ax + 1, top - above(3), 1, 1, tone.dots, false);
      if (leaving || grow > 160) fill(ax + 3, top - above(7), 2, 2, tone.dots, false);
      if (leaving || grow > 320) {
        const frame = spark[Math.floor(now / 120) % spark.length];
        stamp(frame, ax + 3, top - above(17), tone.body, leaving ? presence.spark : pop(clamp((grow - 320) / 200, 0, 1)));
      }
    }
    if (presence.question > 0.05) {
      const bob = Math.floor(now / 300) % 2;
      const scale = scaleOf("question");
      stamp(question, left + bw - 2, top - above(13) + bob, tone.hint, scale);
      if (age("question") > 380 || !aim.props.includes("question")) stamp(hint, left - 5, top - above(9) + (1 - bob), tone.hint, scale * 0.95);
    }
    if (presence.bang > 0.05) {
      stamp(bang, left + bw + 1, top - above(9), tone.bang, scaleOf("bang"));
    }
    if (presence.bell > 0.05) {
      const frame = Math.floor(now / 140) % 4;
      const grid = bell[frame === 0 ? 1 : frame === 2 ? 2 : 0];
      const bx = left + bw - 1;
      const by = top - above(14);
      stamp(grid, bx, by, { a: tone.bellShade, b: tone.bell, s: tone.bellShade, c: tone.clapper }, scaleOf("bell"));
      if (presence.bell > 0.9) {
        if (frame === 0) {
          fill(bx - 2, by + 2, 1, 3, tone.ring, false);
          fill(bx - 3, by + 1, 1, 1, tone.ring, false);
        }
        if (frame === 2) {
          fill(bx + 10, by + 2, 1, 3, tone.ring, false);
          fill(bx + 11, by + 1, 1, 1, tone.ring, false);
        }
      }
    }
    if (presence.sweat > 0.05) {
      const cycle = (now - shownAt.sweat) % 1200;
      const slide = Math.floor((cycle / 1200) * 6);
      if (cycle < 1050) stamp(drop, left - 3 + shear(top), top + slide, tone.sweat, scaleOf("sweat"));
    }
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      const life = (now - particle.born) / particle.life;
      if (life >= 1 || particle.y > (perch ? world.height : world.floor + 2)) {
        particles.splice(index, 1);
        continue;
      }
      const x = Math.round(particle.x);
      const y = Math.round(particle.y);
      if (particle.kind === "glyph") {
        if (life > 0.82 && Math.floor(now / 50) % 2) continue;
        stamp(glyphs[particle.shape], x, y, particle.color);
      } else if (particle.kind === "confetti") {
        if (life > 0.85 && Math.floor(now / 60) % 2) continue;
        const flutter = (Math.floor((now - particle.born) / 110) + particle.shape) % 3;
        fill(x, y, flutter === 1 ? 2 : 1, flutter === 2 ? 2 : 1, particle.color, false);
      } else if (particle.kind === "steam") {
        if (life > 0.8 && Math.floor(now / 60) % 2) continue;
        stamp(puffs[life < 0.45 ? 0 : 1], x, y, particle.color);
      } else if (particle.kind === "zee") {
        const size = life < 0.3 ? 0 : life < 0.62 ? 1 : 2;
        if (life > 0.9 && Math.floor(now / 70) % 2) continue;
        stamp(zees[size], x + Math.round(Math.sin(life * 7) * 1.5), y, particle.color);
      } else {
        stamp(puffs[Math.min(puffs.length - 1, Math.floor(life * puffs.length))], x, y, particle.color);
      }
    }
  };
  const step = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (period && mood !== "sleeping" && Math.floor(now / beat) !== lastBeat) {
      lastBeat = Math.floor(now / beat);
      restart(lastBeat * beat);
      from = mood;
    }
    const t = now - since;
    const aim = aims[mood]({ t, now: period ? now % period : now, gaze, from });
    if (perch && gaze.y > 0 && downcast.includes(mood)) aim.pose.eyeY = Math.max(aim.pose.eyeY, 1);
    const length = mood === "sleeping" ? 420 : 240;
    const k = clamp(t / length, 0, 1);
    shown = k >= 1 ? aim.pose : mix(held, aim.pose, ease(k));
    glow = clamp(glow + (mood === "done" && tint ? dt / 0.5 : -dt / 0.4), 0, 1);
    for (const prop of allProps) {
      const on = aim.props.includes(prop);
      if (on && presence[prop] === 0) shownAt[prop] = now;
      presence[prop] = clamp(presence[prop] + (on ? dt / 0.22 : -dt / 0.16), 0, 1);
    }
    for (const particle of particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.kind === "confetti") {
        particle.vy += 70 * dt;
        particle.vx *= 1 - 1.6 * dt;
        particle.vy = Math.min(particle.vy, 22);
      }
    }
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      if (now - particle.born >= particle.life || particle.y > (perch ? world.height : world.floor + 2)) particles.splice(index, 1);
    }
    emit(now, t, shape(shown, perch));
    return { t, aim, k };
  };
  if (period) {
    warming = true;
    for (let time = start; time < start + period; time += 1000 / 60) step(time);
    warming = false;
  }
  const frame = (time) => {
    const now = time + seed;
    const { t, aim, k } = step(now);
    draw(now, t, aim, k);
  };
  return { feel, replay, look: (next) => (gaze = next), frame };
}
