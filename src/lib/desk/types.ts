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

export type Scene = {
  backgroundId?: string;
  layers: SceneLayer[];
};

export type Asset = {
  id: string;
  kind: AssetKind;
  name: string;
  spec: Spec;
  takes: Take[];
  activeTakeId: string | null;
  scene?: Scene;
};

export type Trace = {
  id: string;
  role: "user" | "director" | "tool";
  text: string;
  tool?: string;
  cost?: number;
};

export type DeskProject = {
  title: string;
  assets: Asset[];
  selectedId: string;
  platesSpent: number;
  trace: Trace[];
};

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
