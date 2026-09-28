import { interpret, type Brief } from "@/lib/desk/brief";
import { type CallArgs } from "@/lib/desk/deepseek.functions";
import { getBlob, putBlob } from "@/lib/desk/idb";
import { generarLamina } from "@/lib/desk/image.functions";
import { dataUrlToBlob, extractPalette, flipSrc, shrinkSrc } from "@/lib/desk/images";
import type { DeskKeys } from "@/lib/desk/keys";
import { planBeats } from "@/lib/desk/partitura";
import { openNextShot } from "@/lib/desk/reel";
import { activeSrc, emptySpec, nid, useDesk } from "@/lib/desk/store";
import { VIEW_LABEL, type Asset, type Take, type ViewName } from "@/lib/desk/types";

export function isShortOrder(brief: string) {
  const text = brief.trim().toLowerCase();
  return text.length < 48 || /^(fondo|perfil|frente|espalda|expres|paleta|escena|tres|ficha|entra|mira|para|otro plano)\b/.test(text);
}

export async function runInterpreted(said: string, asset: Asset | undefined, keys: DeskKeys) {
  const brief = interpret(said, asset, useDesk.getState().project);
  useDesk.getState().setLastBrief(brief);
  await enact(brief, asset, keys);
}

export async function runLocal(brief: string, asset: Asset | undefined, keys: DeskKeys) {
  await runInterpreted(brief, asset, keys);
}

function writePartitura(said: string, asset: Asset | undefined) {
  const desk = useDesk.getState();
  const scene = asset?.kind === "escena" ? asset : desk.project.assets.find((item) => item.kind === "escena");
  if (!scene) {
    desk.pushTrace({ role: "director", text: "No hay plano. Crea uno en Archivo." });
    return;
  }
  const beats = planBeats(said, desk.project);
  desk.select(scene.id);
  desk.setBeats(scene.id, beats);
  if (beats[0]) desk.stageBeat(scene.id, beats[0].id);
  desk.pushTrace({
    role: "tool",
    tool: "partitura",
    text: `${beats.length} poses: ${beats.map((beat) => beat.label).join(" → ")}. Reuso. 0 láminas.`,
    cost: 0,
  });
}

async function enact(brief: Brief, asset: Asset | undefined, keys: DeskKeys) {
  const desk = useDesk.getState();
  if (brief.intent === "paleta" && asset) {
    const src = activeSrc(asset);
    if (!src) return;
    const resolved = src.startsWith("idb:") ? await objectFromIdb(src) : src;
    const palette = await extractPalette(resolved);
    desk.patchSpec(asset.id, { palette });
    desk.pushTrace({ role: "tool", tool: "paleta", text: palette.join(" "), cost: 0 });
    return;
  }
  if (brief.intent === "nuevo_plano") {
    openNextShot(asset?.kind === "escena" ? asset : undefined);
    return;
  }
  if (brief.intent === "partitura") {
    writePartitura(brief.said, asset);
    return;
  }
  if (brief.intent === "escena") {
    const scene = desk.project.assets.find((item) => item.kind === "escena");
    if (scene) desk.select(scene.id);
    desk.pushTrace({ role: "tool", tool: "componer_escena", text: brief.spoken, cost: 0 });
    return;
  }
  if (brief.intent === "ficha" && asset) {
    desk.patchSpec(asset.id, brief.spec);
    desk.pushTrace({ role: "tool", tool: "ficha", text: brief.spoken, cost: 0 });
    return;
  }
  if (brief.intent === "nuevo_personaje" || brief.intent === "nuevo_fondo") {
    const kind = brief.createKind ?? "personaje";
    const created: Asset = {
      id: nid(),
      kind,
      name: brief.createName || (kind === "fondo" ? "Lugar nuevo" : "Personaje nuevo"),
      spec: { ...emptySpec(), ...brief.spec },
      takes: [],
      activeTakeId: null,
      thread: [{ id: nid(), role: "director", text: brief.spoken }],
    };
    desk.addAsset(created);
    if (brief.view && keys.brush !== "off") await mintPlate(created, brief.view, keys, brief.paint);
    else desk.pushTrace({ role: "director", text: "Ficha lista. Sube un boceto o enciende un pincel en Ajustes." });
    return;
  }
  if (brief.intent === "vista" && asset && brief.view) {
    await mintPlate(asset, brief.view, keys, brief.paint);
    return;
  }
  if (brief.intent === "fondo") {
    const target = asset?.kind === "fondo" ? asset : desk.project.assets.find((item) => item.kind === "fondo");
    if (target) await mintPlate(target, "fondo", keys, brief.paint);
    else desk.pushTrace({ role: "director", text: brief.spoken });
    return;
  }
  desk.pushTrace({ role: "director", text: brief.spoken });
}

export async function runCall(name: string, args: CallArgs, asset: Asset | undefined, keys: DeskKeys) {
  const desk = useDesk.getState();
  if (name === "partitura") {
    writePartitura(args.prompt || args.notes, asset);
    return;
  }
  if (name === "crear_activo") {
    const kind = args.kind === "fondo" ? "fondo" : "personaje";
    const created: Asset = {
      id: nid(),
      kind,
      name: args.name || (kind === "fondo" ? "Lugar nuevo" : "Personaje nuevo"),
      spec: {
        ...emptySpec(),
        costume: args.costume,
        role: args.role,
        notes: args.notes,
        never: args.never,
      },
      takes: [],
      activeTakeId: null,
      thread: [{ id: nid(), role: "director", text: `Chat de ${args.name || kind}. Mismo corto.` }],
    };
    desk.addAsset(created);
    desk.pushTrace({ role: "tool", tool: "crear_activo", text: created.name, cost: 0 });
    return;
  }
  if (!asset) return;
  if (name === "ficha") {
    desk.patchSpec(asset.id, {
      costume: args.costume || asset.spec.costume,
      role: args.role || asset.spec.role,
      notes: args.notes || asset.spec.notes,
      never: args.never.length > 0 ? args.never : asset.spec.never,
    });
    desk.pushTrace({ role: "tool", tool: "ficha", text: "Ficha actualizada. 0 laminas.", cost: 0 });
    return;
  }
  if (name === "fijar" && asset.activeTakeId) {
    desk.lockTake(asset.id, asset.activeTakeId);
    desk.pushTrace({ role: "tool", tool: "fijar", text: `Toma fijada en ${asset.name}.`, cost: 0 });
    return;
  }
  if (name === "paleta") {
    await runInterpreted("paleta", asset, keys);
    return;
  }
  if (name === "componer_escena") {
    const scene = desk.project.assets.find((item) => item.kind === "escena");
    const layer = scene?.scene?.layers[0];
    if (scene && layer) {
      desk.setLayer(scene.id, layer.id, { x: args.x ?? layer.x, y: args.y ?? layer.y, scale: args.scale ?? layer.scale });
      desk.select(scene.id);
      desk.pushTrace({ role: "tool", tool: "componer_escena", text: "Posicion. 0 laminas.", cost: 0 });
    }
    return;
  }
  if (name === "generar_lamina") {
    const allowed: ViewName[] = ["frente", "perfil", "tres_cuartos", "espalda", "expresion", "fondo", "prop", "boceto"];
    const view = allowed.find((item) => item === args.view) ?? "perfil";
    const cooked = interpret(args.prompt || view, asset, desk.project);
    desk.setLastBrief(cooked);
    await mintPlate(asset, view, keys, cooked.paint || args.prompt);
  }
}

export async function objectFromIdb(src: string): Promise<string> {
  if (!src.startsWith("idb:")) return src;
  const blob = await getBlob(src.slice(4));
  if (!blob) throw new Error("La lamina no esta en este navegador");
  return URL.createObjectURL(blob);
}

function nearestTake(asset: Asset, view: ViewName): Take | undefined {
  const prefer: ViewName[] =
    view === "perfil" ? ["perfil", "frente", "tres_cuartos"] : view === "fondo" ? ["fondo"] : ["frente", "perfil", "boceto"];
  for (const name of prefer) {
    const hit = asset.takes.find((take) => take.view === name);
    if (hit) return hit;
  }
  return asset.takes[0];
}

async function deriveTake(asset: Asset, view: ViewName, source: Take) {
  const desk = useDesk.getState();
  let src = source.src;
  if (view === "perfil" && source.view === "frente") {
    const raw = await objectFromIdb(source.src);
    const flipped = await flipSrc(raw);
    const id = nid();
    await putBlob(id, dataUrlToBlob(flipped));
    if (source.src.startsWith("idb:")) URL.revokeObjectURL(raw);
    src = `idb:${id}`;
  }
  desk.addTake(asset.id, {
    id: `${view}-${nid()}`,
    view,
    label: `${VIEW_LABEL[view]} · desde ${source.label}`,
    src,
    locked: false,
    cost: 0,
    prompt: `derivado de ${source.view}`,
  });
  desk.pushTrace({ role: "tool", tool: "derivar", text: `${VIEW_LABEL[view]} de ${asset.name} sale de ${source.label}. Coste 0.`, cost: 0 });
}

export async function mintPlate(asset: Asset, view: ViewName, keys: DeskKeys, prompt?: string) {
  const desk = useDesk.getState();
  const target =
    view === "fondo"
      ? (desk.project.assets.find((item) => item.id === asset.id && item.kind === "fondo") ?? desk.project.assets.find((item) => item.kind === "fondo") ?? asset)
      : asset.kind === "personaje" || asset.kind === "prop"
        ? asset
        : (desk.project.assets.find((item) => item.kind === "personaje") ?? asset);

  const source = nearestTake(target, view);
  if (source && source.view !== view) {
    await deriveTake(target, view, source);
    return;
  }
  if (source && source.view === view) {
    desk.setActiveTake(target.id, source.id);
    desk.pushTrace({ role: "director", text: `${VIEW_LABEL[view]} ya existe en ${target.name}.` });
    return;
  }

  if (keys.brush === "off") {
    desk.pushTrace({
      role: "director",
      text: `${target.name} no tiene ${VIEW_LABEL[view]}. El pincel gratis está apagado a propósito. Sube un boceto o pon xAI en Ajustes.`,
    });
    return;
  }
  if (keys.brush === "xai" && !keys.image) {
    desk.pushTrace({ role: "director", text: "Elegiste xAI y falta la clave." });
    return;
  }
  if (keys.brush === "trial" && target.takes.length > 0 && target.kind !== "fondo") {
    desk.pushTrace({ role: "director", text: `${target.name} ya tiene cara. El pincel de prueba no inventa una prima.` });
    return;
  }

  const current = activeSrc(target);
  let reference: string | undefined;
  if (current) {
    const raw = await objectFromIdb(current);
    reference = await shrinkSrc(raw, 768);
    if (current.startsWith("idb:")) URL.revokeObjectURL(raw);
  }
  const costume = target.spec.costume || asset.spec.costume;
  const text =
    prompt ||
    (view === "fondo"
      ? `Fondo ${target.name}. ${target.spec.notes}. Sin personas.`
      : `El mismo personaje. ${costume}. ${target.spec.role} Vista ${VIEW_LABEL[view]}.`);
  desk.pushTrace({ role: "director", text: `Pincel ${keys.brush}: ${VIEW_LABEL[view]} de ${target.name}.` });
  const result = await generarLamina({
    data: { prompt: text, view, reference, imageKey: keys.brush === "xai" ? keys.image : "" },
  });
  if (!result.ok) {
    desk.pushTrace({ role: "director", text: result.error });
    throw new Error(result.error);
  }
  const id = nid();
  await putBlob(id, dataUrlToBlob(result.dataUrl));
  desk.addTake(target.id, {
    id: `${view}-${id}`,
    view,
    label: VIEW_LABEL[view] ?? view,
    src: `idb:${id}`,
    locked: false,
    cost: 1,
    prompt: text,
  });
  desk.spendPlate();
  desk.pushTrace({ role: "tool", tool: "generar_lamina", text: `${VIEW_LABEL[view]} de ${target.name}.`, cost: 1 });
}
