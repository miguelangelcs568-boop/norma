export type AssetKind = "personaje" | "fondo" | "escena" | "prop";

export type ViewName =
  | "boceto"
  | "frente"
  | "perfil"
  | "tres_cuartos"
  | "espalda"
  | "expresion"
  | "fondo"
  | "prop";

export type Take = {
  id: string;
  view: ViewName;
  label: string;
  src: string;
  locked: boolean;
  cost: number;
  prompt?: string;
};

export type Spec = {
  role: string;
  costume: string;
  palette: string[];
  never: string[];
  notes: string;
};

export type SceneLayer = {
  id: string;
  name: string;
  src: string;
  x: number;
  y: number;
  scale: number;
  flip: boolean;
};

export type Beat = {
  id: string;
  label: string;
  action: string;
  view: ViewName;
  characterId: string;
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  status: "borrador" | "fijado";
};

export type Scene = {
  backgroundId?: string;
  layers: SceneLayer[];
  beats: Beat[];
  activeBeatId?: string | null;
};

export type Trace = {
  id: string;
  role: "user" | "director" | "tool";
  text: string;
  tool?: string;
  cost?: number;
};

export type Asset = {
  id: string;
  kind: AssetKind;
  name: string;
  spec: Spec;
  takes: Take[];
  activeTakeId: string | null;
  scene?: Scene;
  thread: Trace[];
};

export type DeskProject = {
  title: string;
  assets: Asset[];
  selectedId: string;
  platesSpent: number;
  trace: Trace[];
};

export type Brush = "off" | "trial" | "xai";

export const VIEW_LABEL: Record<ViewName, string> = {
  boceto: "Boceto",
  frente: "Frente",
  perfil: "Perfil",
  tres_cuartos: "Tres cuartos",
  espalda: "Espalda",
  expresion: "Expresión",
  fondo: "Fondo",
  prop: "Prop",
};

export function viewsFor(kind: AssetKind): ViewName[] {
  if (kind === "fondo") return ["fondo"];
  if (kind === "prop") return ["prop"];
  if (kind === "personaje") return ["frente", "perfil", "tres_cuartos", "espalda", "expresion"];
  return [];
}

export function missingViews(asset: Asset): ViewName[] {
  const have = new Set((asset.takes ?? []).map((take) => take.view));
  return viewsFor(asset.kind).filter((view) => !have.has(view));
}

export function roomOf(project: DeskProject, asset: Asset | undefined): Trace[] {
  if (!asset) return project.trace ?? [];
  if (asset.thread && asset.thread.length > 0) return asset.thread;
  return project.trace ?? [];
}

export function briefFor(asset: Asset): string {
  if (asset.kind === "escena") {
    const n = asset.scene?.beats?.length ?? 0;
    if (n === 0) return `${asset.name}. Una frase de acción se parte en poses. No se pinta el capítulo.`;
    return `${asset.name}. ${n} poses. Clic en una o fíjala. Reusa láminas.`;
  }
  const miss = missingViews(asset);
  if (miss.length === 0) {
    return `${asset.name} cubierto. Lo que pidas se reusa o se deriva.`;
  }
  return `${asset.name}. Falta ${miss.map((view) => VIEW_LABEL[view]).join(", ")}. Una frase en este chat basta.`;
}
