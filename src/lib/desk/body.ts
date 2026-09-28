import { nid, useDesk } from "./store";
import { takeFor, VIEW_LABEL, type Asset, type ViewName } from "./types";

const PARENT: Partial<Record<ViewName, ViewName>> = {
  camina: "perfil",
  para: "frente",
  mira: "perfil",
};

export function fillActing(asset: Asset) {
  const desk = useDesk.getState();
  for (const view of ["camina", "para", "mira"] as ViewName[]) {
    if (asset.takes.some((item) => item.view === view)) continue;
    const source = takeFor(asset, PARENT[view] ?? "frente");
    if (!source) continue;
    desk.addTake(asset.id, {
      id: `${view}-${nid()}`,
      view,
      label: `${VIEW_LABEL[view]} · desde ${source.label}`,
      src: source.src,
      locked: false,
      cost: 0,
      prompt: `cuerpo desde ${source.view}`,
    });
  }
  desk.pushTrace({
    role: "tool",
    tool: "cuerpo",
    text: `Camina, para y mira de ${asset.name} salen de frente/perfil. Cambia el dibujo cuando tengas uno. 0 láminas.`,
    cost: 0,
  });
}
