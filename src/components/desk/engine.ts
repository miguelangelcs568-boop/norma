import { interpret, type Brief } from "@/lib/desk/brief";
import { type CallArgs } from "@/lib/desk/deepseek.functions";
import { getBlob, putBlob } from "@/lib/desk/idb";
import { generarLamina } from "@/lib/desk/image.functions";
import { dataUrlToBlob, extractPalette, flipSrc, shrinkSrc } from "@/lib/desk/images";
import { activeSrc, emptySpec, nid, useDesk } from "@/lib/desk/store";
import { VIEW_LABEL, type Asset, type Take, type ViewName } from "@/lib/desk/types";

export function isShortOrder(brief: string) {
  const text = brief.trim().toLowerCase();
  return text.length < 48 || /^(fondo|perfil|frente|espalda|expres|paleta|escena|tres|ficha)\b/.test(text);
}

export async function runInterpreted(said: string, asset: Asset | undefined, imageKey: string) {
  const brief = interpret(said, asset, useDesk.getState().project);
  useDesk.getState().setLastBrief(brief);
  await enact(brief, asset, imageKey);
}

export async function runLocal(brief: string, asset: Asset | undefined, imageKey: string) {
  await runInterpreted(brief, asset, imageKey);
}

async function enact(brief: Brief, asset: Asset | undefined, imageKey: string) {
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
    };
    desk.addAsset(created);
    desk.pushTrace({ role: "director", text: brief.spoken });
    if (brief.view) await mintPlate(created, brief.view, imageKey, brief.paint);
    return;
  }
  if (brief.intent === "vista" && asset && brief.view) {
    await mintPlate(asset, brief.view, imageKey, brief.paint);
    return;
  }
  if (brief.intent === "fondo") {
    const target = asset?.kind === "fondo" ? asset : desk.project.assets.find((item) => item.kind === "fondo");
    if (target) await mintPlate(target, "fondo", imageKey, brief.paint);
    else desk.pushTrace({ role: "director", text: brief.spoken });
    return;
  }
  desk.pushTrace({ role: "director", text: brief.spoken });
}

export async function runCall(name: string, args: CallArgs, asset: Asset | undefined, imageKey: string) {
  const desk = useDesk.getState();
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
  if (name === "paleta") {
    await runInterpreted("paleta", asset, imageKey);
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
    await mintPlate(asset, view, imageKey, cooked.paint || args.prompt);
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

export async function mintPlate(asset: Asset, view: ViewName, imageKey: string, prompt?: string) {
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

  if (!imageKey && target.takes.length > 0 && target.kind !== "fondo") {
    desk.pushTrace({ role: "director", text: `${target.name} ya tiene cara. El pincel gratis no inventa una prima.` });
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
  desk.pushTrace({ role: "director", text: `Pincel: ${VIEW_LABEL[view]} de ${target.name}.` });
  const result = await generarLamina({ data: { prompt: text, view, reference, imageKey } });
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
