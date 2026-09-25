export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header ?? "")?.[1] ?? "image/jpeg";
  const binary = atob(data ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo abrir la lámina"));
    image.src = src;
  });
}

export async function shrinkSrc(src: string, max = 768): Promise<string> {
  const image = await loadImage(src);
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin lienzo");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export async function extractPalette(src: string, count = 5): Promise<string[]> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  const w = 40;
  const h = Math.max(1, Math.round((40 * image.height) / image.width));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(image, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const buckets = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum > 0.92 || lum < 0.05) continue;
    const key = [r, g, b].map((channel) => Math.round(channel / 24) * 24).join(",");
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => {
      const [r, g, b] = key.split(",").map((n) => Number(n).toString(16).padStart(2, "0"));
      return `#${r}${g}${b}`;
    });
}

export async function exportScene(opts: {
  background: string;
  layers: { src: string; x: number; y: number; scale: number; flip: boolean }[];
  width?: number;
}): Promise<Blob> {
  const width = opts.width ?? 1280;
  const height = Math.round((width * 9) / 16);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin lienzo");
  const bg = await loadImage(opts.background);
  ctx.drawImage(bg, 0, 0, width, height);
  for (const layer of opts.layers) {
    const image = await loadImage(layer.src);
    const h = height * layer.scale;
    const w = h * (image.width / image.height);
    const x = width * layer.x;
    const y = height * layer.y;
    ctx.save();
    if (layer.flip) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, w, h);
    } else {
      ctx.drawImage(image, x, y, w, h);
    }
    ctx.restore();
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo exportar");
  return blob;
}

const cutCache = new Map<string, Promise<string>>();

export function keyPaper(src: string): Promise<string> {
  const hit = cutCache.get(src);
  if (hit) return hit;
  const job = cutPaper(src).catch(() => src);
  cutCache.set(src, job);
  return job;
}

async function cutPaper(src: string): Promise<string> {
  const image = await loadImage(src);
  const scale = Math.min(1, 900 / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  if (w < 8 || h < 8) return src;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(image, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const sample = (x0: number, y0: number) => {
    let r = 0;
    let g = 0;
    let b = 0;
    const n = 36;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const i = ((y0 + y) * w + (x0 + x)) * 4;
        r += d[i] ?? 0;
        g += d[i + 1] ?? 0;
        b += d[i + 2] ?? 0;
      }
    }
    return [r / n, g / n, b / n];
  };
  const corners = [sample(0, 0), sample(w - 6, 0), sample(0, h - 6), sample(w - 6, h - 6)];
  const paper = corners.reduce(
    (acc, corner) => [acc[0] + corner[0] / 4, acc[1] + corner[1] / 4, acc[2] + corner[2] / 4],
    [0, 0, 0],
  );
  const distAt = (i: number) => {
    const dr = (d[i] ?? 0) - paper[0];
    const dg = (d[i + 1] ?? 0) - paper[1];
    const db = (d[i + 2] ?? 0) - paper[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  const isPaper = (i: number) => {
    const lum = (0.2126 * (d[i] ?? 0) + 0.7152 * (d[i + 1] ?? 0) + 0.0722 * (d[i + 2] ?? 0)) / 255;
    return distAt(i) < 48 && lum > 0.74;
  };

  const mask = new Uint8Array(w * h);
  const queue: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (mask[p]) return;
    if (!isPaper(p * 4)) return;
    mask[p] = 1;
    queue.push(p);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  let head = 0;
  while (head < queue.length) {
    const p = queue[head++] ?? 0;
    const x = p % w;
    const y = (p / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  const halo: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (mask[p]) continue;
      if (distAt(p * 4) > 34) continue;
      let n = 0;
      if (mask[p - 1]) n++;
      if (mask[p + 1]) n++;
      if (mask[p - w]) n++;
      if (mask[p + w]) n++;
      if (n >= 2) halo.push(p);
    }
  }
  for (const p of halo) mask[p] = 1;

  let cut = 0;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    d[p * 4 + 3] = 0;
    cut++;
  }
  const fraction = cut / mask.length;
  if (fraction < 0.04 || fraction > 0.86) return src;
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}
