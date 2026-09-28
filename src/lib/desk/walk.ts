import { getBlob } from "./idb";
import { extractPalette, keyPaper, loadImage } from "./images";
import { takeFor } from "./types";
import type { Asset, DeskProject } from "./types";

export type WalkPose = {
  bob: number;
  lean: number;
  hip: number;
  left: { thigh: number; shin: number; foot: number };
  right: { thigh: number; shin: number; foot: number };
  armL: number;
  armR: number;
};

/** Un ciclo = dos pasos. p en 0..1 */
export function walkPose(p: number): WalkPose {
  const t = p * Math.PI * 2;
  const leg = (phase: number) => {
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    return {
      thigh: s * 0.52,
      shin: 0.18 + Math.max(0, s) * 0.62,
      foot: c * 0.28 - Math.max(0, -s) * 0.2,
    };
  };
  return {
    bob: Math.abs(Math.sin(t * 2)) * 0.016,
    lean: Math.sin(t) * 0.05,
    hip: Math.sin(t) * 0.04,
    left: leg(t),
    right: leg(t + Math.PI),
    armL: -Math.sin(t) * 0.75,
    armR: Math.sin(t) * 0.75,
  };
}

async function resolveSrc(src: string) {
  if (!src.startsWith("idb:")) return src;
  const blob = await getBlob(src.slice(4));
  if (!blob) throw new Error("Falta la lámina del cuerpo");
  return URL.createObjectURL(blob);
}

function sample(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const data = ctx.getImageData(Math.max(0, x | 0), Math.max(0, y | 0), Math.max(1, w | 0), Math.max(1, h | 0)).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < 80) continue;
    r += data[i] ?? 0;
    g += data[i + 1] ?? 0;
    b += data[i + 2] ?? 0;
    n++;
  }
  if (!n) return "#3a2a20";
  return `rgb(${(r / n) | 0}, ${(g / n) | 0}, ${(b / n) | 0})`;
}

function capsule(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, thick: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(20,16,12,0.35)";
  ctx.lineWidth = 1;
  const r = thick / 2;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(len, -r);
  ctx.arc(len, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(0, r);
  ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export type WalkKit = {
  torso: HTMLImageElement;
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
};

export async function buildWalkKit(project: DeskProject): Promise<WalkKit> {
  const person = project.assets.find((item) => item.kind === "personaje");
  const take = takeFor(person, "camina") ?? takeFor(person, "perfil") ?? takeFor(person, "frente") ?? person?.takes[0];
  if (!take) throw new Error("No hay cuerpo para andar. Abre Lina y pulsa Cuerpo.");
  const raw = await resolveSrc(take.src);
  const cut = await keyPaper(raw);
  const image = await loadImage(cut);
  if (raw.startsWith("blob:")) URL.revokeObjectURL(raw);

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Sin lienzo");
  ctx.drawImage(image, 0, 0);
  const shirt = sample(ctx, image.width * 0.35, image.height * 0.28, image.width * 0.3, image.height * 0.16);
  const pants = sample(ctx, image.width * 0.35, image.height * 0.55, image.width * 0.3, image.height * 0.16);
  const skin = sample(ctx, image.width * 0.42, image.height * 0.14, image.width * 0.16, image.height * 0.08);
  const palette = await extractPalette(cut).catch(() => [] as string[]);
  const torso = document.createElement("canvas");
  const tw = image.width;
  const th = Math.round(image.height * 0.5);
  torso.width = tw;
  torso.height = th;
  const tctx = torso.getContext("2d");
  if (!tctx) throw new Error("Sin torso");
  tctx.drawImage(image, 0, 0, tw, th, 0, 0, tw, th);
  const torsoImg = await loadImage(torso.toDataURL("image/png"));
  return { torso: torsoImg, shirt, pants, skin, hair: palette[3] ?? "#1c1915" };
}

export function drawWalker(
  ctx: CanvasRenderingContext2D,
  kit: WalkKit,
  pose: WalkPose,
  hipX: number,
  hipY: number,
  height: number,
  flip: boolean,
) {
  const s = height;
  ctx.save();
  ctx.translate(hipX, hipY - pose.bob * s);
  if (flip) ctx.scale(-1, 1);
  ctx.rotate(pose.lean);

  const thigh = s * 0.22;
  const shin = s * 0.2;
  const foot = s * 0.08;
  const arm = s * 0.2;
  const forearm = s * 0.16;
  const thick = s * 0.055;

  const limb = (side: WalkPose["left"], armAng: number, shade: number) => {
    ctx.save();
    ctx.rotate(pose.hip * (shade > 0.5 ? 1 : -1));
    const pants = kit.pants;
    const shirt = kit.shirt;
    capsule(ctx, 0, 0, thigh, thick * 1.15, side.thigh + 1.15, pants);
    const kx = Math.cos(side.thigh + 1.15) * thigh;
    const ky = Math.sin(side.thigh + 1.15) * thigh;
    ctx.save();
    ctx.translate(kx, ky);
    capsule(ctx, 0, 0, shin, thick * 0.95, side.shin + 0.15, pants);
    const ax = Math.cos(side.shin + 0.15) * shin;
    const ay = Math.sin(side.shin + 0.15) * shin;
    ctx.translate(ax, ay);
    capsule(ctx, 0, 0, foot, thick * 0.7, side.foot + 0.2, kit.skin);
    ctx.restore();
    capsule(ctx, 0, -s * 0.28, arm, thick * 0.8, armAng + 1.2, shirt);
    const ex = Math.cos(armAng + 1.2) * arm;
    const ey = Math.sin(armAng + 1.2) * arm - s * 0.28;
    ctx.save();
    ctx.translate(ex, ey);
    capsule(ctx, 0, 0, forearm, thick * 0.7, armAng * 0.45 + 0.4, kit.skin);
    ctx.restore();
    ctx.restore();
  };

  limb(pose.right, pose.armR, 0.35);
  const torsoH = s * 0.52;
  const torsoW = torsoH * (kit.torso.width / Math.max(1, kit.torso.height));
  ctx.drawImage(kit.torso, -torsoW * 0.5, -torsoH * 0.92, torsoW, torsoH);
  limb(pose.left, pose.armL, 0.8);
  ctx.restore();
}

export async function playWalk(
  ctx: CanvasRenderingContext2D,
  project: DeskProject,
  opts: { seconds?: number; fromX?: number; toX?: number; y?: number; height?: number; flip?: boolean; stopped?: () => boolean },
) {
  const kit = await buildWalkKit(project);
  const seconds = opts.seconds ?? 2.6;
  const start = performance.now();
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const fondo = project.assets.find((item) => item.kind === "fondo");
  let bg: HTMLImageElement | null = null;
  const bgSrc = fondo?.takes[0]?.src;
  if (bgSrc) {
    const url = await resolveSrc(bgSrc);
    bg = await loadImage(url);
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      if (opts.stopped?.()) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - start) / (seconds * 1000));
      const cycles = t * (seconds * 1.15);
      const pose = walkPose(cycles % 1);
      ctx.clearRect(0, 0, w, h);
      if (bg) ctx.drawImage(bg, 0, 0, w, h);
      const x = w * ((opts.fromX ?? 0.12) + ((opts.toX ?? 0.72) - (opts.fromX ?? 0.12)) * t);
      const y = h * ((opts.y ?? 0.78) - pose.bob);
      drawWalker(ctx, kit, pose, x, y, h * (opts.height ?? 0.62), opts.flip ?? false);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

export function isWalkAsk(text: string) {
  return /camin|anda|andar|pasos|echen a andar|que camine/.test(text.toLowerCase());
}
