export type AssetKind = "personaje" | "fondo" | "escena" | "prop";

export type ViewName =
  | "boceto"
  | "frente"
  | "perfil"
  | "tres_cuartos"
  | "espalda"
  | "expresion"
  | "camina"
  | "para"
  | "mira"
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
  ms?: number;
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
  place: string;
  look: string;
  assets: Asset[];
  selectedId: string;
  platesSpent: number;
  trace: Trace[];
  reel?: string[];
};

export type Brush = "off" | "trial" | "xai";

export const VIEW_LABEL: Record<ViewName, string> = {
  boceto: "Boceto",
  frente: "Frente",
  perfil: "Perfil",
  tres_cuartos: "Tres cuartos",
  espalda: "Espalda",
  expresion: "Expresión",
  camina: "Camina",
  para: "Para",
  mira: "Mira",
  fondo: "Fondo",
  prop: "Prop",
};

export const ACTING_VIEWS: ViewName[] = ["camina", "para", "mira"];

export function viewsFor(kind: AssetKind): ViewName[] {
  if (kind === "fondo") return ["fondo"];
  if (kind === "prop") return ["prop"];
  if (kind === "personaje") return ["camina", "para", "mira", "frente", "perfil", "tres_cuartos", "espalda", "expresion"];
  return [];
}

export function takeFor(asset: Asset | undefined, view: ViewName): Take | undefined {
  if (!asset) return undefined;
  const order: ViewName[] =
    view === "camina"
      ? ["camina", "perfil", "frente"]
      : view === "para"
        ? ["para", "frente", "perfil"]
        : view === "mira"
          ? ["mira", "perfil", "frente"]
          : [view, "frente", "perfil"];
  for (const name of order) {
    const hit = asset.takes.find((item) => item.view === name);
    if (hit) return hit;
  }
  return asset.takes[0];
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
    if (n === 0) return `${asset.name}. Una frase de acción se parte en poses.`;
    return `${asset.name}. ${n} poses.`;
  }
  const body = ACTING_VIEWS.filter((view) => !asset.takes.some((take) => take.view === view));
  if (body.length) return `${asset.name}. Falta cuerpo: ${body.map((view) => VIEW_LABEL[view]).join(", ")}.`;
  return `${asset.name} tiene cuerpo. El plano lo reusa.`;
}
