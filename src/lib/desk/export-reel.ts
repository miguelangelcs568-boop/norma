import { getBlob } from "./idb";
import { keyPaper, loadImage } from "./images";
import { beatMs } from "./partitura";
import { shotsOf } from "./reel";
import type { Asset, Beat, DeskProject } from "./types";

const W = 1280;
const H = 720;
const FPS = 12;

async function resolveSrc(src: string) {
  if (!src.startsWith("idb:")) return src;
  const blob = await getBlob(src.slice(4));
  if (!blob) throw new Error("Falta una lámina en este navegador");
  return URL.createObjectURL(blob);
}

function mime() {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return types.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) ?? "";
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function personOf(project: DeskProject, beat: Beat) {
  return project.assets.find((item) => item.id === beat.characterId) ?? project.assets.find((item) => item.kind === "personaje");
}

function takeSrc(person: Asset | undefined, view: Beat["view"], fallback: string) {
  const take = person?.takes.find((item) => item.view === view) ?? person?.takes.find((item) => item.view === "frente") ?? person?.takes[0];
  return take?.src ?? fallback;
}

async function drawFrame(
  ctx: CanvasRenderingContext2D,
  bg: HTMLImageElement,
  sprite: HTMLImageElement,
  x: number,
  y: number,
  scale: number,
  flip: boolean,
) {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(bg, 0, 0, W, H);
  const h = H * scale;
  const w = h * (sprite.width / Math.max(1, sprite.height));
  const left = W * x;
  const top = H * y;
  ctx.save();
  if (flip) {
    ctx.translate(left + w, top);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0, w, h);
  } else {
    ctx.drawImage(sprite, left, top, w, h);
  }
  ctx.restore();
}

function waitFrame() {
  return new Promise((resolve) => setTimeout(resolve, 1000 / FPS));
}

export async function exportReel(project: DeskProject) {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Este navegador no graba video. Abre Chrome o Edge.");
  }
  const type = mime();
  if (!type) throw new Error("Este navegador no graba WebM. Abre Chrome o Edge.");

  const shots = shotsOf(project).filter((shot) => (shot.scene?.beats?.length ?? 0) > 0);
  if (shots.length === 0) throw new Error("No hay poses para grabar. Escribe una acción en un plano.");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin lienzo");

  const stream = canvas.captureStream(FPS);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const done = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    rec.onerror = () => reject(new Error("No se pudo grabar"));
  });
  rec.start();

  const made: string[] = [];
  try {
    for (const shot of shots) {
      const beats = shot.scene?.beats ?? [];
      const fondo = project.assets.find((item) => item.id === shot.scene?.backgroundId) ?? project.assets.find((item) => item.kind === "fondo");
      const bgSrc = fondo?.takes[0]?.src;
      if (!bgSrc) continue;
      const bgUrl = await resolveSrc(bgSrc);
      if (bgUrl.startsWith("blob:")) made.push(bgUrl);
      const bg = await loadImage(bgUrl);
      const layerSrc = shot.scene?.layers[0]?.src ?? "";

      for (let i = 0; i < beats.length; i++) {
        const from = beats[i];
        const to = beats[i + 1];
        const person = personOf(project, from);
        const fromRaw = await resolveSrc(takeSrc(person, from.view, layerSrc));
        if (fromRaw.startsWith("blob:")) made.push(fromRaw);
        const fromCut = await keyPaper(fromRaw);
        const fromImg = await loadImage(fromCut);

        const hold = Math.max(1, Math.round((beatMs(from) / 1000) * FPS));
        for (let f = 0; f < hold; f++) {
          await drawFrame(ctx, bg, fromImg, from.x, from.y, from.scale, from.flip);
          await waitFrame();
        }
        if (!to) continue;
        const toPerson = personOf(project, to);
        const toRaw = await resolveSrc(takeSrc(toPerson, to.view, layerSrc));
        if (toRaw.startsWith("blob:")) made.push(toRaw);
        const toCut = await keyPaper(toRaw);
        const toImg = await loadImage(toCut);
        const travel = Math.max(3, Math.round((Math.min(900, beatMs(from)) / 1000) * FPS));
        for (let f = 1; f <= travel; f++) {
          const t = ease(f / travel);
          const img = t < 0.5 ? fromImg : toImg;
          await drawFrame(
            ctx,
            bg,
            img,
            lerp(from.x, to.x, t),
            lerp(from.y, to.y, t),
            lerp(from.scale, to.scale, t),
            t < 0.5 ? from.flip : to.flip,
          );
          await waitFrame();
        }
      }
    }
  } finally {
    if (rec.state !== "inactive") rec.stop();
    for (const url of made) URL.revokeObjectURL(url);
  }

  const blob = await done;
  if (blob.size < 400) throw new Error("El video salió vacío.");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${project.title.replace(/\s+/g, "-").toLowerCase() || "norma"}.webm`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}
