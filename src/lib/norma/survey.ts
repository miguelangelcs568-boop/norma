import { altitudeM, hash2, octaveCount, seedToInt } from "./math";
import type { Biome, LocationParams } from "./types";

export type Rect = { x: number; y: number; w: number; h: number };

export type SurveyColors = {
  ink: string;
  sheet: string;
  accent: string;
  water: string;
  canopy: string;
};

export type SurveyPerson = { name: string; heightM: number };
export type SurveyCamera = { name: string; x: number; y: number; distanceM: number; fovRad: number };

export type SurveySpec = {
  width: number;
  height: number;
  params: LocationParams;
  zoom: number;
  doorM: number;
  doorWidthM: number;
  colors: SurveyColors;
  people: SurveyPerson[];
  cameras: SurveyCamera[];
};

export function splitRooms(seed: number, metersWide: number, metersDeep: number): Rect[] {
  let rooms: Rect[] = [{ x: 0, y: 0, w: metersWide, h: metersDeep }];
  for (let i = 0; i < 4; i++) {
    const next: Rect[] = [];
    rooms.forEach((r, index) => {
      const horiz = r.w >= r.h;
      const span = horiz ? r.w : r.h;
      if (span < 5.2) {
        next.push(r);
        return;
      }
      const t = 0.4 + hash2(i + 3, index + 1, seed) * 0.2;
      const cut = span * t;
      if (horiz) {
        next.push({ x: r.x, y: r.y, w: cut, h: r.h });
        next.push({ x: r.x + cut, y: r.y, w: r.w - cut, h: r.h });
      } else {
        next.push({ x: r.x, y: r.y, w: r.w, h: cut });
        next.push({ x: r.x, y: r.y + cut, w: r.w, h: r.h - cut });
      }
    });
    rooms = next;
  }
  return rooms;
}

export function interiorIssues(params: LocationParams, doorWidthM: number): string[] {
  if (params.biome !== "interior") return [];
  const rooms = splitRooms(seedToInt(params.seed), params.metersWide, params.metersDeep);
  return rooms
    .filter((r) => Math.min(r.w, r.h) < doorWidthM + 0.4)
    .map(
      (r) =>
        `Una sala de ${r.w.toFixed(1)} × ${r.h.toFixed(1)} m no admite una puerta de ${doorWidthM.toFixed(1)} m.`,
    );
}

export function drawSurvey(ctx: CanvasRenderingContext2D, spec: SurveySpec) {
  const { width, height, params, colors } = spec;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.sheet;
  ctx.fillRect(0, 0, width, height);
  if (params.biome === "interior") drawInterior(ctx, spec);
  else drawTerrain(ctx, spec);
  drawScale(ctx, spec);
  ctx.fillStyle = colors.ink;
  ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(`octavas ${octaveCount(spec.zoom)} · zoom ×${spec.zoom.toFixed(1)} · bytes nuevos 0`, 16, height - 16);
}

function worldMapper(spec: SurveySpec) {
  const viewW = spec.params.metersWide / spec.zoom;
  const viewH = viewW * (spec.height / spec.width);
  const cx = spec.params.biome === "interior" ? spec.params.metersWide / 2 : 0;
  const cy = spec.params.biome === "interior" ? spec.params.metersDeep / 2 : 0;
  const x0 = cx - viewW / 2;
  const y0 = cy - viewH / 2;
  return {
    viewW,
    viewH,
    sx: (wx: number) => ((wx - x0) / viewW) * spec.width,
    sy: (wy: number) => ((wy - y0) / viewH) * spec.height,
    mx: spec.width / viewW,
  };
}

function drawTerrain(ctx: CanvasRenderingContext2D, spec: SurveySpec) {
  const { width, height, params, colors } = spec;
  const seed = seedToInt(params.seed);
  const octaves = octaveCount(spec.zoom);
  const map = worldMapper(spec);
  const cols = 150;
  const rows = Math.max(40, Math.round((cols * height) / width));
  const field = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const wx = -map.viewW / 2 + (x / (cols - 1)) * map.viewW;
      const wy = -map.viewH / 2 + (y / (rows - 1)) * map.viewH;
      let z = altitudeM(wx, wy, seed, params.elevation, octaves);
      if (params.biome === "urbano") {
        const street = Math.abs(wx % 22) < 2.2 || Math.abs(wy % 22) < 2.2;
        z = street ? -0.4 : Math.round(z);
      }
      if (params.biome === "salar") z *= 0.25;
      field[y * cols + x] = z;
    }
  }
  const waterLine = (params.moisture - 0.45) * 3;
  const cellW = width / cols;
  const cellH = height / rows;
  ctx.fillStyle = colors.water;
  ctx.globalAlpha = params.biome === "salar" ? 0.08 : 0.38;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const z = field[y * cols + x] ?? 0;
      if (z < waterLine) ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
  ctx.globalAlpha = 1;

  if (params.biome === "estero" || params.biome === "selva") {
    ctx.fillStyle = colors.canopy;
    for (let i = 0; i < 70; i++) {
      const wx = -map.viewW / 2 + hash2(i, 4, seed) * map.viewW;
      const wy = -map.viewH / 2 + hash2(i, 9, seed) * map.viewH;
      const z = altitudeM(wx, wy, seed, params.elevation, octaves);
      const shore = params.biome === "estero" ? z > waterLine && z < waterLine + 0.9 : z > waterLine;
      if (!shore) continue;
      const px = map.sx(wx);
      const py = map.sy(wy);
      ctx.fillRect(px, py, 2, 2);
    }
  }

  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.72;
  const levels: number[] = [];
  for (let level = -8; level <= 8; level += 2) levels.push(level);
  for (const level of levels) {
    ctx.beginPath();
    ctx.lineWidth = level % 2 === 0 ? 1.25 : 0.6;
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols - 1; x++) {
        const a = field[y * cols + x] ?? 0;
        const b = field[y * cols + x + 1] ?? 0;
        const c = field[(y + 1) * cols + x] ?? 0;
        const d = field[(y + 1) * cols + x + 1] ?? 0;
        const pts: [number, number][] = [];
        const pushEdge = (v0: number, v1: number, x0: number, y0: number, x1: number, y1: number) => {
          if ((v0 < level && v1 >= level) || (v0 >= level && v1 < level)) {
            const t = (level - v0) / (v1 - v0 || 1);
            pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
          }
        };
        pushEdge(a, b, x, y, x + 1, y);
        pushEdge(b, d, x + 1, y, x + 1, y + 1);
        pushEdge(d, c, x + 1, y + 1, x, y + 1);
        pushEdge(c, a, x, y + 1, x, y);
        if (pts.length >= 2) {
          const p0 = pts[0];
          const p1 = pts[1];
          if (!p0 || !p1) continue;
          ctx.moveTo(p0[0] * cellW, p0[1] * cellH);
          ctx.lineTo(p1[0] * cellW, p1[1] * cellH);
        }
      }
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  drawCameras(ctx, spec, map.sx, map.sy);
}

function drawInterior(ctx: CanvasRenderingContext2D, spec: SurveySpec) {
  const { params, colors } = spec;
  const seed = seedToInt(params.seed);
  const rooms = splitRooms(seed, params.metersWide, params.metersDeep);
  const map = worldMapper(spec);
  ctx.lineJoin = "miter";
  rooms.forEach((room, index) => {
    const x = map.sx(room.x);
    const y = map.sy(room.y);
    const w = room.w * map.mx;
    const h = room.h * (spec.height / map.viewH);
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    const tight = Math.min(room.w, room.h) < spec.doorWidthM + 0.4;
    if (w > 64 && h > 32) {
      ctx.fillStyle = tight ? colors.accent : colors.ink;
      ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${room.w.toFixed(1)} × ${room.h.toFixed(1)} m`, x + w / 2, y + h / 2);
    }
    if (index > 0) {
      const gap = spec.doorWidthM * map.mx;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5 - gap / 2, y);
      ctx.lineTo(x + w * 0.5 + gap / 2, y);
      ctx.stroke();
    }
  });
  ctx.fillStyle = colors.ink;
  ctx.textAlign = "left";
  ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(`planta · techo ${params.ceilingM.toFixed(2)} m · puerta ${spec.doorM.toFixed(2)} m`, 16, 22);
  drawCameras(ctx, spec, map.sx, map.sy);
}

function drawCameras(
  ctx: CanvasRenderingContext2D,
  spec: SurveySpec,
  sx: (wx: number) => number,
  sy: (wy: number) => number,
) {
  for (const camera of spec.cameras) {
    const x = sx(camera.x);
    const y = sy(camera.y);
    const len = camera.distanceM * (spec.width / (spec.params.metersWide / spec.zoom));
    const half = camera.fovRad / 2;
    ctx.strokeStyle = spec.colors.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(-half) * len, y - Math.cos(-half) * len);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(half) * len, y - Math.cos(half) * len);
    ctx.stroke();
    ctx.fillStyle = spec.colors.accent;
    ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(camera.name, x + 6, y);
  }
}

function drawScale(ctx: CanvasRenderingContext2D, spec: SurveySpec) {
  const { colors } = spec;
  const pxPerM = spec.width / (spec.params.metersWide / spec.zoom);
  const barM = pxPerM > 40 ? 2 : pxPerM > 12 ? 5 : 20;
  const barPx = barM * pxPerM;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(16, 28);
  ctx.lineTo(16 + barPx, 28);
  ctx.moveTo(16, 24);
  ctx.lineTo(16, 32);
  ctx.moveTo(16 + barPx, 24);
  ctx.lineTo(16 + barPx, 32);
  ctx.stroke();
  ctx.fillStyle = colors.ink;
  ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${barM} m`, 16, 48);

  const person = spec.people[0];
  if (!person) return;
  const ph = person.heightM * pxPerM;
  const baseX = spec.width - 36;
  const baseY = spec.height - 36;
  ctx.strokeStyle = colors.accent;
  ctx.strokeRect(baseX - 4, baseY - ph, 8, ph);
  ctx.fillText(`${Math.round(person.heightM * 100)} cm`, baseX - 78, baseY - 4);
}

export function biomeHint(biome: Biome): string {
  if (biome === "interior") return "Las salas son cortes de la semilla. Si una no admite la puerta, no se firma.";
  if (biome === "urbano") return "Las calles son el módulo de 22 m. El edificio no es una foto.";
  if (biome === "salar") return "Poca elevación. El zoom no inventa montañas que la semilla no tiene.";
  if (biome === "selva") return "El dosel son puntos donde el relieve sale del agua. Misma función.";
  return "Estero: agua bajo la cota, mangle en la orilla. Curvas cada metro.";
}
