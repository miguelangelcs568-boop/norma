import { beatMs } from "./partitura";
import { emptySpec, nid, useDesk } from "./store";
import type { Asset, DeskProject } from "./types";

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function tween(ms: number, tick: (t: number) => void) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / Math.max(200, ms));
      tick(ease(t));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shotsOf(project: DeskProject): Asset[] {
  const all = project.assets.filter((item) => item.kind === "escena");
  const order = project.reel ?? [];
  const mapped = order.map((id) => all.find((item) => item.id === id)).filter((item): item is Asset => Boolean(item));
  const rest = all.filter((item) => !order.includes(item.id));
  return mapped.length ? [...mapped, ...rest] : all;
}

export function nextShotName(project: DeskProject): string {
  let max = 9;
  for (const shot of shotsOf(project)) {
    const n = Number(shot.name.match(/(\d+)/)?.[1] ?? 0);
    if (n > max) max = n;
  }
  return `PL ${String(max + 1).padStart(3, "0")}`;
}

export function mintShot(project: DeskProject, from?: Asset): Asset {
  const list = shotsOf(project);
  const prev = from ?? list[list.length - 1];
  const person = project.assets.find((item) => item.kind === "personaje");
  const take = person?.takes.find((item) => item.view === "frente") ?? person?.takes[0];
  const name = nextShotName(project);
  return {
    id: nid(),
    kind: "escena",
    name,
    spec: {
      ...emptySpec(),
      notes: `Sigue a ${prev?.name ?? "el plano anterior"}. Escribe la acción en este chat.`,
    },
    takes: [],
    activeTakeId: null,
    thread: [{ id: nid(), role: "director", text: `Chat de ${name}. Una frase de acción. Ver el rollo las une.` }],
    scene: {
      backgroundId: prev?.scene?.backgroundId ?? project.assets.find((item) => item.kind === "fondo")?.id,
      layers: prev?.scene?.layers?.length
        ? prev.scene.layers.map((layer) => ({ ...layer, id: nid() }))
        : person && take
          ? [{ id: nid(), name: person.name, src: take.src, x: 0.4, y: 0.24, scale: 0.68, flip: false }]
          : [],
      beats: [],
      activeBeatId: null,
    },
  };
}

export function openNextShot(from?: Asset) {
  const desk = useDesk.getState();
  const shot = mintShot(desk.project, from);
  desk.addAsset(shot);
  desk.pushTrace({ role: "tool", tool: "plano", text: `${shot.name} entra al rollo. 0 láminas.`, cost: 0 });
  return shot;
}

export async function playShot(sceneId: string, stopped: () => boolean) {
  const desk = useDesk.getState();
  const scene = desk.project.assets.find((item) => item.id === sceneId);
  const beats = scene?.scene?.beats ?? [];
  if (beats.length === 0) return;
  if (beats.length === 1) {
    desk.stageBeat(sceneId, beats[0].id);
    await wait(beatMs(beats[0]));
    return;
  }
  for (let i = 0; i < beats.length; i++) {
    if (stopped()) return;
    const from = beats[i];
    const to = beats[i + 1];
    desk.stageBeat(sceneId, from.id);
    await wait(beatMs(from));
    if (!to || stopped()) continue;
    const layerId = useDesk.getState().project.assets.find((item) => item.id === sceneId)?.scene?.layers[0]?.id;
    if (!layerId) continue;
    await tween(Math.min(900, beatMs(from)), (t) => {
      if (stopped()) return;
      useDesk.getState().setLayer(sceneId, layerId, {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        scale: from.scale + (to.scale - from.scale) * t,
        flip: t < 0.5 ? from.flip : to.flip,
      });
    });
    desk.stageBeat(sceneId, to.id);
  }
}

export async function playReel(stopped: () => boolean) {
  const shots = shotsOf(useDesk.getState().project);
  for (const shot of shots) {
    if (stopped()) return;
    useDesk.getState().select(shot.id);
    await wait(80);
    await playShot(shot.id, stopped);
  }
}
