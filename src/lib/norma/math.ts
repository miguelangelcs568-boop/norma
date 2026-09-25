/** Hash and value noise. The location is this function plus a seed, never a bitmap. */
export function hash2(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm(x: number, y: number, seed: number, octaves: number): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += a * valueNoise(x * f, y * f, seed + i * 101);
    norm += a;
    a *= 0.5;
    f *= 2;
  }
  return norm === 0 ? 0 : v / norm;
}

export function seedToInt(hex: string): number {
  let h = 2166136261;
  const s = hex.trim().toUpperCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function fingerprint(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function num(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

export function sensorHeightMm(sensorWidthMm: number): number {
  return sensorWidthMm * (24 / 36);
}

/** Image height of a subject on the sensor, in millimeters. h' = f · H / d */
export function imageHeightMm(focalMm: number, subjectM: number, distanceM: number): number {
  if (distanceM <= 0.05) return Number.POSITIVE_INFINITY;
  return (focalMm * subjectM) / distanceM;
}

/** Fraction of the vertical frame occupied by the subject. */
export function frameFraction(
  focalMm: number,
  subjectM: number,
  distanceM: number,
  sensorWidthMm: number,
): number {
  return imageHeightMm(focalMm, subjectM, distanceM) / sensorHeightMm(sensorWidthMm);
}

/** Distance that puts the subject at a target frame fraction. */
export function distanceForFraction(
  focalMm: number,
  subjectM: number,
  fraction: number,
  sensorWidthMm: number,
): number {
  const sensorH = sensorHeightMm(sensorWidthMm);
  return (focalMm * subjectM) / (fraction * sensorH);
}

export function fovXRad(focalMm: number, sensorWidthMm: number): number {
  return 2 * Math.atan(sensorWidthMm / (2 * focalMm));
}

export function octaveCount(zoom: number): number {
  return Math.min(8, 4 + Math.floor(Math.log2(Math.max(1, zoom))));
}

/** Relative altitude in meters. z = (ruido − 0.5) × elevación × 12 */
export function altitudeM(
  wx: number,
  wy: number,
  seed: number,
  elevation: number,
  octaves: number,
): number {
  const n = fbm(wx * 0.045, wy * 0.045, seed, octaves);
  return (n - 0.5) * elevation * 12;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatRatio(stored: number, inflated: number): string {
  if (stored <= 0) return "—";
  const r = Math.max(1, Math.round(inflated / stored));
  return `1 : ${new Intl.NumberFormat("es-CO").format(r)}`;
}

export const RASTER_PLATE = 1920 * 1080 * 4;
export const VIDEO_FRAMES = 24 * 4;
