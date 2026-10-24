const linear = (channel) => (channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
const gamma = (channel) => (channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055);
export function toLch(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => linear(parseInt(hex.slice(index, index + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [lightness, Math.hypot(a, bb), Math.atan2(bb, a)];
}
function channels([lightness, chroma, hue]) {
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3);
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
export function toHex(color) {
  const [lightness, , hue] = color;
  let chroma = color[1];
  let rgb = channels([lightness, chroma, hue]);
  for (let step = 0; step < 24 && rgb.some((channel) => channel < -0.001 || channel > 1.001); step++) {
    chroma *= 0.94;
    rgb = channels([lightness, chroma, hue]);
  }
  return `#${rgb
    .map((channel) =>
      Math.round(Math.min(1, Math.max(0, gamma(Math.min(1, Math.max(0, channel))))) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
export function mixLch(from, to, k) {
  let turn = to[2] - from[2];
  if (turn > Math.PI) turn -= Math.PI * 2;
  if (turn < -Math.PI) turn += Math.PI * 2;
  const hue = from[1] < 0.02 ? to[2] : to[1] < 0.02 ? from[2] : from[2] + turn * k;
  return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, hue];
}
export function shift([lightness, chroma, hue], light, saturate = 1) {
  return [lightness + light, chroma * saturate, hue];
}
