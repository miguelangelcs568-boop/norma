import { type CallArgs } from "@/lib/desk/deepseek.functions";
import { getBlob, putBlob } from "@/lib/desk/idb";
import { generarLamina } from "@/lib/desk/image.functions";
import { dataUrlToBlob, extractPalette, flipSrc, shrinkSrc } from "@/lib/desk/images";
import { activeSrc, nid, useDesk } from "@/lib/desk/store";
import { VIEW_LABEL, type Asset, type Take, type ViewName } from "@/lib/desk/types";

const SHORT = ["fondo", "perfil", "frente", "espalda", "expresion", "expresión", "paleta", "escena", "tres cuartos"];

export function isShortOrder(brief: string) {
  const text = brief.trim().toLowerCase();
  return SHORT.some((word) => text === word || text.startsWith(`${word} `));
}

export async function runLocal(brief: string, asset: Asset | undefined, imageKey: string) {
  const pushTrace = useDesk.getState().pushTrace;
  const text = brief.toLowerCase();
  if (!asset) {
    pushTrace({ role: "director", text: "Abre un personaje o un fondo en el archivo." });
    return;
  }
  if (text.includes("paleta")) {
    const src = activeSrc(asset);
    if (!src) return;
    const url = src.startsWith("idb:") ? "" : src;
    const resolved = url || (await objectFromIdb(src));
    const palette = await extractPalette(resolved);
    useDesk.getState().patchSpec(asset.id, { palette });
    pushTrace({ role: "tool", tool: "paleta", text: palette.join(" "), cost: 0 });
    return;
  }
  if (text.includes("escena") || text.includes("mueve") || text.includes("coloca")) {
    const scene = useDesk.getState().project.assets.find((item) => item.kind === "escena");
    if (scene) useDesk.getState().select(scene.id);
    pushTrace({ role: "tool", tool: "componer_escena", text: "Abrí la escena. Arrastra. Cuesta 0.", cost: 0 });
    return;
  }
  const view = text.includes("expres")
    ? "expresion"
    : text.includes("perfil")
      ? "perfil"
      : text.includes("espalda")
        ? "espalda"
        : text.includes("tres")
          ? "tres_cuartos"
          : text.includes("frente")
            ? "frente"
            : text.includes("fondo")
              ? "fondo"
              : null;
  if (!view) {
    pushTrace({
      role: "director",
      text: "Órdenes cortas: perfil, expresión, frente, fondo, paleta, escena.",
    });
    return;
  }
  await mintPlate(asset, view, imageKey);
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
    desk.pushTrace({ role: "tool", tool: "ficha", text: "Ficha actualizada. 0 láminas.", cost: 0 });
    return;
  }
  if (name === "paleta") {
    await runLocal("paleta", asset, imageKey);
    return;
  }
  if (name === "componer_escena") {
    const scene = desk.project.assets.find((item) => item.kind === "escena");
    const layer = scene?.scene?.layers[0];
    if (scene && layer) {
      const x = args.x ?? layer.x;
      const y = args.y ?? layer.y;
      const scale = args.scale ?? layer.scale;
      desk.setLayer(scene.id, layer.id, { x, y, scale });
      desk.select(scene.id);
      desk.pushTrace({ role: "tool", tool: "componer_escena", text: `Posición ${x.toFixed(2)}, ${y.toFixed(2)}. 0 láminas.`, cost: 0 });
    }
    return;
  }
  if (name === "generar_lamina") {
    const allowed: ViewName[] = ["frente", "perfil", "tres_cuartos", "espalda", "expresion", "fondo", "prop", "boceto"];
    const view = allowed.find((item) => item === args.view) ?? "perfil";
    await mintPlate(asset, view, imageKey, args.prompt || undefined);
  }
}

export async function objectFromIdb(src: string): Promise<string> {
  if (!src.startsWith("idb:")) return src;
  const blob = await getBlob(src.slice(4));
  if (!blob) throw new Error("La lámina no está en este navegador");
  return URL.createObjectURL(blob);
}

function nearestTake(asset: Asset, view: ViewName): Take | undefined {
  const prefer: ViewName[] =
    view === "perfil" ? ["perfil", "frente", "tres_cuartos"] : view === "fondo" ? ["fondo"] : ["frente", "perfil", "boceto", "tres_cuartos", "expresion", "espalda"];
  for (const name of prefer) {
    const hit = asset.takes.find((take) => take.view === name);
    if (hit) return hit;
  }
  return asset.takes[0];
}

async function deriveTake(asset: Asset, view: ViewName, source: Take) {
  const desk = useDesk.getState();
  const flip = view === "perfil" && source.view === "frente";
  let src = source.src;
  if (flip) {
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
  desk.pushTrace({
    role: "tool",
    tool: "derivar",
    text: `${VIEW_LABEL[view]} de ${asset.name} sale de ${source.label}. Misma cara, coste 0. El pincel gratis no pinta otra persona.`,
    cost: 0,
  });
}

export async function mintPlate(asset: Asset, view: ViewName, imageKey: string, prompt?: string) {
  const desk = useDesk.getState();
  const target =
    view === "fondo"
      ? (desk.project.assets.find((item) => item.kind === "fondo") ?? asset)
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

  if (!imageKey) {
    desk.pushTrace({
      role: "director",
      text:
        target.kind === "fondo"
          ? "No hay fondo todavía. Súbelo con Subir. El pincel gratis inventa un lugar que no es Punta Palma."
          : `No hay lámina de ${target.name}. Sube un boceto. El pincel gratis inventa otra cara y no sirve para este corto.`,
    });
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
      ? `Fondo de animación, lugar ${target.name}. ${target.spec.notes}. Sin personas, sin texto.`
      : `El mismo personaje. ${costume}. Vista ${VIEW_LABEL[view]}. No cambies la ropa ni la paleta. Cuerpo entero salvo que la vista sea expresión.`);
  desk.pushTrace({ role: "director", text: `Pincel fino: ${VIEW_LABEL[view]}.` });
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
  desk.pushTrace({
    role: "tool",
    tool: "generar_lamina",
    text: `${VIEW_LABEL[view]} de ${target.name}. Una lámina, no el corto entero.`,
    cost: 1,
  });
}
