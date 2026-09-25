import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { canLock, findNode, isLockable, stepInput, stepsFor } from "./compile";
import { fingerprint } from "./math";
import { createBlankProject, createDemoProject } from "./seed-project";
import type {
  Biome,
  Bible,
  CharacterMetrics,
  Decision,
  LocationParams,
  NodeKind,
  Project,
  ShotParams,
  StudioNode,
} from "./types";

export type Pane = "archivo" | "hoja" | "corte";

const NODE_CAP = 80;

type State = {
  project: Project;
  mobilePane: Pane;
  setMobilePane: (pane: Pane) => void;
  select: (id: string) => void;
  rename: (id: string, name: string) => void;
  setFolderBrief: (id: string, brief: string) => void;
  setIntent: (id: string, intent: string) => void;
  patchBible: (patch: Partial<Bible>) => void;
  patchCharacter: (id: string, patch: Partial<CharacterMetrics>) => void;
  patchLocation: (id: string, patch: Partial<LocationParams>) => void;
  patchShot: (id: string, patch: Partial<ShotParams>) => void;
  applyFields: (id: string, fields: Record<string, number>) => void;
  lockStep: (id: string, step: string) => boolean;
  reopen: (id: string, step: string) => void;
  addNode: (kind: Exclude<NodeKind, "biblia">) => void;
  removeNode: (id: string) => void;
  addDecision: (decision: Omit<Decision, "id" | "at">) => void;
  recordModelCall: () => void;
  loadDemo: () => void;
  loadBlank: () => void;
};

function nid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function mapNode(project: Project, id: string, fn: (node: StudioNode) => StudioNode): Project {
  return { ...project, nodes: project.nodes.map((node) => (node.id === id ? fn(node) : node)) };
}

function destination(project: Project): string | null {
  const selected = findNode(project, project.selectedId);
  if (!selected) return null;
  if (selected.kind === "carpeta" || selected.kind === "secuencia") return selected.id;
  return selected.parentId;
}

function freshNode(kind: Exclude<NodeKind, "biblia">, parentId: string | null, seed: string): StudioNode {
  const id = nid();
  if (kind === "carpeta") return { id, parentId, kind, name: "Carpeta nueva", brief: "" };
  if (kind === "secuencia") return { id, parentId, kind, name: "SEQ nueva", intent: "" };
  if (kind === "personaje") {
    return {
      id,
      parentId,
      kind,
      name: "Personaje",
      locks: [],
      metrics: {
        heightCm: 170,
        heads: 7,
        shoulderY: 0.19,
        hipY: 0.48,
        shoulderW: 0.26,
        eyeLine: 0.5,
        arm: 0.4,
        lineWeight: 1.5,
        asymmetry: 0.06,
        piel: 0,
        ropa: 1,
        pelo: 3,
      },
    };
  }
  if (kind === "locacion") {
    return {
      id,
      parentId,
      kind,
      name: "Locación",
      locks: [],
      params: {
        seed,
        biome: "estero" satisfies Biome,
        elevation: 0.4,
        moisture: 0.5,
        hour: 16,
        metersWide: 40,
        metersDeep: 28,
        ceilingM: 2.7,
      },
    };
  }
  return {
    id,
    parentId,
    kind: "plano",
    name: "PL nuevo",
    locks: [],
    shot: {
      characterId: "",
      locationId: "",
      distanceM: 5,
      focalMm: 35,
      tiltDeg: 0,
      centered: false,
    },
  };
}

function descendants(nodes: StudioNode[], id: string): string[] {
  const kids = nodes.filter((n) => n.parentId === id).map((n) => n.id);
  return [id, ...kids.flatMap((kid) => descendants(nodes, kid))];
}

export const useStudio = create<State>()(
  persist(
    (set, get) => ({
      project: createDemoProject(),
      mobilePane: "hoja",
      setMobilePane: (mobilePane) => set({ mobilePane }),
      select: (id) => set({ project: { ...get().project, selectedId: id }, mobilePane: "hoja" }),
      rename: (id, name) =>
        set({ project: mapNode(get().project, id, (node) => ({ ...node, name: name.slice(0, 64) })) }),
      setFolderBrief: (id, brief) =>
        set({
          project: mapNode(get().project, id, (node) =>
            node.kind === "carpeta" ? { ...node, brief: brief.slice(0, 280) } : node,
          ),
        }),
      setIntent: (id, intent) =>
        set({
          project: mapNode(get().project, id, (node) =>
            node.kind === "secuencia" ? { ...node, intent: intent.slice(0, 280) } : node,
          ),
        }),
      patchBible: (patch) => set({ project: { ...get().project, bible: { ...get().project.bible, ...patch } } }),
      patchCharacter: (id, patch) =>
        set({
          project: mapNode(get().project, id, (node) =>
            node.kind === "personaje" ? { ...node, metrics: { ...node.metrics, ...patch } } : node,
          ),
        }),
      patchLocation: (id, patch) =>
        set({
          project: mapNode(get().project, id, (node) =>
            node.kind === "locacion" ? { ...node, params: { ...node.params, ...patch } } : node,
          ),
        }),
      patchShot: (id, patch) =>
        set({
          project: mapNode(get().project, id, (node) =>
            node.kind === "plano" ? { ...node, shot: { ...node.shot, ...patch } } : node,
          ),
        }),
      applyFields: (id, fields) => {
        const node = findNode(get().project, id);
        if (!node) return;
        if (node.kind === "personaje") {
          const metrics = { ...node.metrics };
          const keys = [
            "heads",
            "shoulderY",
            "hipY",
            "shoulderW",
            "eyeLine",
            "arm",
            "lineWeight",
            "asymmetry",
          ] as const;
          for (const key of keys) {
            const value = fields[key];
            if (typeof value === "number") metrics[key] = value;
          }
          get().patchCharacter(id, metrics);
        } else if (node.kind === "locacion") {
          const params = { ...node.params };
          const keys = ["elevation", "moisture", "metersWide", "metersDeep", "ceilingM", "hour"] as const;
          for (const key of keys) {
            const value = fields[key];
            if (typeof value === "number") params[key] = value;
          }
          get().patchLocation(id, params);
        } else if (node.kind === "plano") {
          const shot = { ...node.shot };
          const keys = ["distanceM", "focalMm", "tiltDeg"] as const;
          for (const key of keys) {
            const value = fields[key];
            if (typeof value === "number") shot[key] = value;
          }
          get().patchShot(id, shot);
        }
      },
      lockStep: (id, step) => {
        const project = get().project;
        const node = findNode(project, id);
        if (!node || !isLockable(node) || !canLock(project, node, step)) return false;
        const fingerprintValue = fingerprint(stepInput(project, id, step));
        const locks = [
          ...node.locks.filter((lock) => lock.step !== step),
          { step, fingerprint: fingerprintValue },
        ];
        set({ project: mapNode(project, id, (current) => (isLockable(current) ? { ...current, locks } : current)) });
        return true;
      },
      reopen: (id, step) => {
        const project = get().project;
        const node = findNode(project, id);
        if (!node || !isLockable(node)) return;
        const steps = stepsFor(node);
        const index = steps.indexOf(step);
        if (index < 0) return;
        const locks = node.locks.filter((lock) => steps.indexOf(lock.step) < index);
        set({ project: mapNode(project, id, (current) => (isLockable(current) ? { ...current, locks } : current)) });
      },
      addNode: (kind) => {
        const project = get().project;
        if (project.nodes.length >= NODE_CAP) return;
        const parentId = destination(project);
        const node = freshNode(kind, parentId, project.bible.seed);
        if (node.kind === "plano") {
          const character = project.nodes.find((n) => n.kind === "personaje");
          const location = project.nodes.find((n) => n.kind === "locacion");
          node.shot.characterId = character?.id ?? "";
          node.shot.locationId = location?.id ?? "";
          node.shot.focalMm = project.bible.focalMm;
        }
        set({
          project: { ...project, nodes: [...project.nodes, node], selectedId: node.id },
          mobilePane: "hoja",
        });
      },
      removeNode: (id) => {
        const project = get().project;
        const node = findNode(project, id);
        if (!node || node.kind === "biblia") return;
        const gone = new Set(descendants(project.nodes, id));
        const nodes = project.nodes.filter((n) => !gone.has(n.id));
        const selectedId = gone.has(project.selectedId) ? (node.parentId ?? "biblia") : project.selectedId;
        set({ project: { ...project, nodes, selectedId } });
      },
      addDecision: (decision) => {
        const project = get().project;
        const next: Decision = {
          ...decision,
          id: nid(),
          at: Date.now(),
          note: decision.note.slice(0, 180),
        };
        set({ project: { ...project, decisions: [next, ...project.decisions].slice(0, 40) } });
      },
      recordModelCall: () => set({ project: { ...get().project, modelCalls: get().project.modelCalls + 1 } }),
      loadDemo: () => set({ project: createDemoProject(), mobilePane: "hoja" }),
      loadBlank: () => set({ project: createBlankProject(), mobilePane: "archivo" }),
    }),
    {
      name: "norma-v1",
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : localStorage,
      ),
      partialize: (state) => ({ project: state.project }),
    },
  ),
);
