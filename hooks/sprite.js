import { mixLch, toHex, toLch } from "../src/color.js";

export const size = { width: 16, height: 7 };
const columns = size.width * 2;
const plain = 0x01000000;
const blank = 0x20;
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const brand = "#d77757";
const skins = { error: "#d24e40", running: "#f3bd9e", waiting: "#ed9d3a", compacting: "#9dbb63", done: "#f0c13e", sleeping: "#8a7ebe" };
const tone = {
  ink: "#141413",
  paper: "#f8eed8",
  line: "#b9a98a",
  glass: "#bfe0f7",
  rim: "#8f9cc0",
  handle: "#b58a63",
  board: "#d4cbee",
  key: "#f8f6fd",
  lit: "#f6b9a2",
  dots: "#b8b0a4",
  bang: "#f0a93a",
  bell: "#f5c94f",
  hint: "#9d89e0",
  sweat: "#86c8f0",
  puff: "#cfc8bd",
  star: "#f2c14e",
  zee: "#a9a3d9",
};
const confetti = ["#f59bb8", "#7fc0ec", "#94d184", "#f5c84f", "#ad97ea", "#f6a879"];
const lch = Object.fromEntries([["brand", brand], ...Object.entries(skins)].map(([name, hex]) => [name, toLch(hex)]));

export const colorOf = (mood) => lch[mood] ?? lch.brand;
export const blend = (from, to, k) => mixLch(from, to, k);

const number = (hex) => parseInt(hex.slice(1, 7), 16);
const wave = (t, period) => Math.floor(t / period);
const hash = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function base64(bytes) {
  let text = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    text += alphabet[(triple >> 18) & 63] + alphabet[(triple >> 12) & 63];
    text += index + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : "=";
    text += index + 2 < bytes.length ? alphabet[triple & 63] : "=";
  }
  return text;
}

export function draw(mood, t, now, skin) {
  const grid = new Int32Array(columns * size.height).fill(-1);
  const body = number(toHex(skin));
  const put = (x, y, color, nudge = 0) => {
    if (y < 0 || y >= size.height) return;
    for (const column of [x * 2 + nudge, x * 2 + 1 + nudge]) if (column >= 0 && column < columns) grid[y * columns + column] = typeof color === "number" ? color : number(color);
  };
  const rect = (x, y, w, h, color, nudge = 0) => {
    for (let row = y; row < y + h; row++) for (let column = x; column < x + w; column++) put(column, row, color, nudge);
  };

  const pose = { dy: 0, nudge: 0, height: 5, eyes: "open", look: 0, up: 0, arms: "rest", tap: false };
  const blink = mood !== "sleeping" && t % 3400 > 3260;

  if (mood === "idle") {
    pose.look = [0, 0, -1, 0, 1, 0][wave(now, 1700) % 6];
    if (blink) pose.eyes = "closed";
  } else if (mood === "listening") {
    pose.dy = t < 260 ? -1 : 0;
    pose.eyes = "wide";
    pose.look = 1;
  } else if (mood === "thinking") {
    pose.eyes = blink ? "closed" : "open";
    pose.up = 1;
    pose.arms = "chin";
  } else if (mood === "reading") {
    pose.eyes = "down";
    pose.look = [-1, 0, 1, 0][wave(now, 420) % 4];
  } else if (mood === "searching") {
    pose.eyes = "open";
    pose.look = 1;
  } else if (mood === "writing") {
    pose.eyes = "down";
  } else if (mood === "running") {
    pose.eyes = "open";
    pose.look = [-1, 1][wave(now, 300) % 2];
    pose.nudge = wave(now, 90) % 2;
    pose.tap = wave(now, 240) % 2 === 0;
  } else if (mood === "error") {
    pose.eyes = "confused";
    pose.arms = t > 500 ? "scratch" : "rest";
    pose.dy = t < 160 ? -1 : 0;
  } else if (mood === "waiting") {
    pose.eyes = "open";
    pose.look = 1;
    pose.arms = wave(now, 260) % 2 ? "wave" : "up";
    pose.tap = wave(now, 300) % 2 === 0;
  } else if (mood === "compacting") {
    pose.eyes = "dizzy";
    pose.height = wave(now, 260) % 2 ? 4 : 5;
    pose.nudge = [0, 1, 0, -1][wave(now, 130) % 4];
  } else if (mood === "done") {
    pose.eyes = "happy";
    pose.arms = "cheer";
    pose.dy = t < 1400 ? (wave(t, 230) % 2 ? -1 : 0) : 0;
    pose.nudge = t >= 1400 ? [0, 1, 0, -1][wave(now, 260) % 4] : 0;
  } else if (mood === "sleeping") {
    pose.eyes = "closed";
    pose.height = wave(now, 1500) % 2 ? 4 : 5;
  }

  const left = 3;
  const bottom = 5 + pose.dy;
  const top = bottom - pose.height + 1;
  const n = pose.nudge;
  rect(left, top, 10, pose.height, body, n);

  const legs = [4, 6, 9, 11];
  legs.forEach((x, index) => {
    if (pose.tap && index === 3) return;
    put(x, bottom + 1, body, n);
  });

  const armRow = top + 2;
  if (pose.arms === "rest" || pose.arms === "chin" || pose.arms === "scratch" || pose.arms === "wave" || pose.arms === "up") put(left - 1, armRow, body, n);
  if (pose.arms === "rest") put(left + 10, armRow, body, n);
  if (pose.arms === "chin") put(left + 10, armRow, body, n);
  if (pose.arms === "scratch") {
    put(left + 10, top - 1, body, n);
    put(left + 10, top - 2 + (wave(now, 200) % 2), body, n);
  }
  if (pose.arms === "up") rect(left + 10, top - 1, 1, 2, body, n);
  if (pose.arms === "wave") {
    put(left + 10, top - 1, body, n);
    put(left + 11, top - 2, body, n);
  }
  if (pose.arms === "cheer") {
    put(left - 1, top - 1, body, n);
    put(left + 10, top - 1, body, n);
  }

  const eyeRow = top + (pose.up ? 0 : pose.eyes === "down" ? 2 : 1);
  const eyes = [left + 2 + pose.look, left + 7 + pose.look];
  const ink = tone.ink;
  eyes.forEach((x, side) => {
    if (pose.eyes === "closed") put(x, top + 2, ink, n);
    else if (pose.eyes === "happy") put(x, top + 1, ink, n);
    else if (pose.eyes === "wide") rect(x, top + 1, 1, 3, ink, n);
    else if (pose.eyes === "confused") rect(x, top + (side ? 2 : 1), 1, side ? 1 : 2, ink, n);
    else if (pose.eyes === "dizzy") put(x, top + 1 + ((wave(now, 160) + side) % 2), ink, n);
    else if (pose.eyes === "down") rect(x, eyeRow, 1, 2, ink, n);
    else rect(x, eyeRow, 1, 2, ink, n);
  });

  if (mood === "listening" && t < 1600) {
    put(14, 0, tone.bang);
    put(14, 1, tone.bang);
  }
  if (mood === "thinking") {
    const lit = wave(now, 300) % 4;
    [11, 13, 15].forEach((x, index) => index < lit && put(x, 0, tone.dots));
  }
  if (mood === "reading") {
    rect(left + 1, bottom - 1, 8, 2, tone.paper, n);
    const shift = wave(now, 420) % 3;
    for (let x = 0; x < 7; x += 2) put(left + 1 + ((x + shift) % 8), bottom - 1, tone.line, n);
  }
  if (mood === "searching") {
    const x = left + 7 + pose.look;
    rect(x, top + 1, 2, 2, tone.glass, n);
    rect(x, top + 1, 1, 2, tone.ink, n);
    put(x + 2, top + 3, tone.handle, n);
    put(x + 3, top + 4, tone.handle, n);
  }
  if (mood === "writing") {
    rect(left, bottom, 10, 1, tone.board, n);
    const key = wave(now, 120) % 10;
    put(left + key, bottom, tone.lit, n);
    put(left + ((key * 7 + 3) % 10), bottom, tone.key, n);
    const fly = wave(now, 260);
    put(4 + ((fly * 5) % 9), 0, confetti[fly % confetti.length]);
  }
  if (mood === "running") {
    const drip = wave(now, 260) % 3;
    put(left - 1, top - 1 + drip, tone.sweat);
  }
  if (mood === "error") {
    if (t > 300) {
      put(14, 0, tone.hint);
      put(15, 1, tone.hint);
      put(14, 3, tone.hint);
    }
    if (wave(now, 350) % 3 === 0) put(1 + (wave(now, 700) % 2), 0, tone.puff);
  }
  if (mood === "waiting") {
    const ring = wave(now, 200) % 2;
    rect(14 + ring, 0, 1, 2, tone.bell);
  }
  if (mood === "compacting") {
    const spin = wave(now, 140) % 8;
    const orbit = [
      [1, 0],
      [7, 0],
      [14, 0],
      [15, 3],
      [14, 6],
      [7, 6],
      [1, 6],
      [0, 3],
    ];
    for (const offset of [0, 3, 6]) {
      const [x, y] = orbit[(spin + offset) % 8];
      put(x, y, tone.star);
    }
  }
  if (mood === "done") {
    const pieces = t < 1800 ? 9 : 4;
    for (let index = 0; index < pieces; index++) {
      const seed = index * 17 + wave(now, 900) * 31;
      const x = Math.floor(hash(seed) * 16);
      const y = (Math.floor(hash(seed + 5) * 7) + wave(now, 180)) % 7;
      if (grid[y * columns + x * 2] === -1) put(x, y, confetti[index % confetti.length]);
    }
  }
  if (mood === "sleeping") {
    const rise = wave(now, 700) % 4;
    put(14, 3 - rise, tone.zee);
    if (rise > 1) put(15, 4 - rise, tone.zee);
  }

  const bytes = new Uint8Array(columns * size.height * 12);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < grid.length; index++) {
    const value = grid[index];
    view.setUint32(index * 12, blank, true);
    view.setUint32(index * 12 + 4, plain, true);
    view.setUint32(index * 12 + 8, value === -1 ? plain : value, true);
  }
  return base64(bytes);
}
