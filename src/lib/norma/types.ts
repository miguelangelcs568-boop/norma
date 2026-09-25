export type NodeKind =
  | "biblia"
  | "carpeta"
  | "personaje"
  | "locacion"
  | "secuencia"
  | "plano";

export type Biome = "estero" | "salar" | "selva" | "urbano" | "interior";

export type Lock = { step: string; fingerprint: string };

export type Pigment = { name: string; hex: string };

export type Bible = {
  title: string;
  logline: string;
  seed: string;
  doorCm: number;
  doorWidthM: number;
  focalMm: number;
  sensorMm: number;
  pigments: Pigment[];
  never: string[];
};

export type CharacterMetrics = {
  heightCm: number;
  heads: number;
  shoulderY: number;
  hipY: number;
  shoulderW: number;
  eyeLine: number;
  arm: number;
  lineWeight: number;
  asymmetry: number;
  piel: number;
  ropa: number;
  pelo: number;
};

export type LocationParams = {
  seed: string;
  biome: Biome;
  elevation: number;
  moisture: number;
  hour: number;
  metersWide: number;
  metersDeep: number;
  ceilingM: number;
};

export type ShotParams = {
  characterId: string;
  locationId: string;
  distanceM: number;
  focalMm: number;
  tiltDeg: number;
  centered: boolean;
};

export type Decision = {
  id: string;
  at: number;
  nodeId: string;
  verb: "aceptar" | "rechazar";
  note: string;
  fields: Record<string, number>;
};

type Base = { id: string; parentId: string | null; name: string };

export type BibleNode = Base & { kind: "biblia" };
export type FolderNode = Base & { kind: "carpeta"; brief: string };
export type SequenceNode = Base & { kind: "secuencia"; intent: string };
export type CharacterNode = Base & {
  kind: "personaje";
  metrics: CharacterMetrics;
  locks: Lock[];
};
export type LocationNode = Base & {
  kind: "locacion";
  params: LocationParams;
  locks: Lock[];
};
export type ShotNode = Base & { kind: "plano"; shot: ShotParams; locks: Lock[] };

export type StudioNode =
  | BibleNode
  | FolderNode
  | SequenceNode
  | CharacterNode
  | LocationNode
  | ShotNode;

export type LockableNode = CharacterNode | LocationNode | ShotNode;

export type Project = {
  version: 1;
  bible: Bible;
  nodes: StudioNode[];
  decisions: Decision[];
  modelCalls: number;
  selectedId: string;
};

export type StepStatus = "abierto" | "firmado" | "sucio";

export type GateLevel = "ok" | "aviso" | "falla";

export type Gate = { level: GateLevel; text: string };

export type Proposal = {
  source: "matematica" | "modelo";
  note: string;
  fields: Record<string, number>;
};

export const MODEL_CAP = 8;

export const STEP_LABEL: Record<string, string> = {
  metricas: "Métricas",
  construccion: "Construcción",
  boceto: "Boceto",
  color: "Color",
  semilla: "Semilla",
  relieve: "Relieve",
  luz: "Luz",
  encuadre: "Encuadre",
  bloqueo: "Bloqueo",
};

export const BIOME_LABEL: Record<Biome, string> = {
  estero: "Estero",
  salar: "Salar",
  selva: "Selva",
  urbano: "Urbano",
  interior: "Interior",
};
