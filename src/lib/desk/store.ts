import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Brief } from "./brief";
import type { Asset, Beat, DeskProject, Scene, SceneLayer, Spec, Take, Trace, ViewName } from "./types";

const emptySpec = (): Spec => ({
  role: "",
  costume: "",
  palette: [],
  never: [],
  notes: "",
});

function take(id: string, view: ViewName, label: string, src: string, locked = true): Take {
  return { id, view, label, src, locked, cost: 0 };
}

function line(text: string): Trace {
  return { id: "t0", role: "director", text };
}

function keepScene(asset: Asset, patch: Partial<Scene>): Scene {
  return {
    backgroundId: patch.backgroundId !== undefined ? patch.backgroundId : asset.scene?.backgroundId,
    layers: patch.layers ?? asset.scene?.layers ?? [],
    beats: patch.beats ?? asset.scene?.beats ?? [],
    activeBeatId: patch.activeBeatId !== undefined ? patch.activeBeatId : asset.scene?.activeBeatId ?? null,
  };
}

export function seedProject(): DeskProject {
  const lina: Asset = {
    id: "lina",
    kind: "personaje",
    name: "Lina Vives",
    spec: {
      role: "Mide el estero. 161 cm. No es un catálogo.",
      costume: "Camisa de lino manchada de sal, pantalón verde mangle, pañuelo óxido en el pelo, zapatos bajos.",
      palette: ["#e4d5bc", "#1e463c", "#a33b24", "#1c1915"],
      never: ["No cambiarle el pañuelo", "No inventar joyas", "No centrarla salvo plano de poder"],
      notes: "Frente y perfil ya están fijados. Una escena se arma con estas láminas, no con otra generación.",
    },
    takes: [
      take("lina-frente", "frente", "Frente", "/desk/lina-frente.jpg"),
      take("lina-perfil", "perfil", "Perfil", "/desk/lina-perfil.jpg"),
    ],
    activeTakeId: "lina-frente",
    thread: [line("Chat de Lina. Frente y perfil ya están. Aquí no se inventa otra cara.")],
  };
  const estero: Asset = {
    id: "estero",
    kind: "fondo",
    name: "Estero norte",
    spec: {
      ...emptySpec(),
      notes: "Lámina de fondo. La luz es de tarde. No lleva personajes pintados.",
      palette: ["#d7c4a4", "#8d5a3c", "#1d3a34", "#6e88a0"],
    },
    takes: [take("estero-fondo", "fondo", "Fondo", "/desk/estero.jpg")],
    activeTakeId: "estero-fondo",
    thread: [line("Chat del Estero norte. Lugar ya pintado. Sin gente en el fondo.")],
  };
  const escena: Asset = {
    id: "pl-010",
    kind: "escena",
    name: "PL 010 Umbral",
    spec: {
      ...emptySpec(),
      notes: "Lina sobre el estero. Una frase de acción se parte en poses.",
    },
    takes: [],
    activeTakeId: null,
    thread: [line("Chat del plano. Di: Lina entra al muelle, para, mira el agua.")],
    scene: {
      backgroundId: "estero",
      layers: [
        {
          id: "lay-lina",
          name: "Lina Vives",
          src: "/desk/lina-frente.jpg",
          x: 0.58,
          y: 0.24,
          scale: 0.68,
          flip: false,
        },
      ],
      beats: [],
      activeBeatId: null,
    },
  };
  return {
    title: "La sal de Punta Palma",
    assets: [lina, estero, escena],
    selectedId: "lina",
    platesSpent: 0,
    trace: [line("Estudio. Cada activo tiene su chat. El mundo es el mismo.")],
  };
}

type State = {
  project: DeskProject;
  pane: "archivo" | "mesa" | "director";
  lastBrief: Brief | null;
  setPane: (pane: State["pane"]) => void;
  setLastBrief: (brief: Brief | null) => void;
  select: (id: string) => void;
  patchSpec: (id: string, patch: Partial<Spec>) => void;
  setActiveTake: (assetId: string, takeId: string) => void;
  addTake: (assetId: string, take: Take) => void;
  lockTake: (assetId: string, takeId: string) => void;
  spendPlate: () => void;
  addAsset: (asset: Asset) => void;
  rename: (id: string, name: string) => void;
  setLayer: (assetId: string, layerId: string, patch: Partial<SceneLayer>) => void;
  placeLayer: (sceneId: string, layer: SceneLayer) => void;
  removeLayer: (sceneId: string, layerId: string) => void;
  setBackgroundId: (sceneId: string, backgroundId: string) => void;
  setBeats: (sceneId: string, beats: Beat[]) => void;
  stageBeat: (sceneId: string, beatId: string) => void;
  lockBeat: (sceneId: string, beatId: string) => void;
  pushTrace: (trace: Omit<Trace, "id">) => void;
  loadProject: (project: DeskProject) => void;
  resetDemo: () => void;
};

function mapAsset(project: DeskProject, id: string, fn: (asset: Asset) => Asset): DeskProject {
  return { ...project, assets: project.assets.map((asset) => (asset.id === id ? fn(asset) : asset)) };
}

function nid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function withThread(asset: Asset): Asset {
  const next = { ...asset, thread: asset.thread ?? [] };
  if (next.kind === "escena") {
    next.scene = {
      backgroundId: next.scene?.backgroundId,
      layers: next.scene?.layers ?? [],
      beats: next.scene?.beats ?? [],
      activeBeatId: next.scene?.activeBeatId ?? null,
    };
  }
  return next;
}

export const useDesk = create<State>()(
  persist(
    (set, get) => ({
      project: seedProject(),
      pane: "mesa",
      lastBrief: null,
      setPane: (pane) => set({ pane }),
      setLastBrief: (lastBrief) => set({ lastBrief }),
      select: (id) => set({ project: { ...get().project, selectedId: id }, pane: "mesa" }),
      patchSpec: (id, patch) =>
        set({
          project: mapAsset(get().project, id, (asset) => ({ ...asset, spec: { ...asset.spec, ...patch } })),
        }),
      setActiveTake: (assetId, takeId) =>
        set({
          project: mapAsset(get().project, assetId, (asset) => ({ ...asset, activeTakeId: takeId })),
        }),
      addTake: (assetId, next) =>
        set({
          project: mapAsset(get().project, assetId, (asset) => ({
            ...asset,
            takes: [...asset.takes.filter((item) => item.id !== next.id), next],
            activeTakeId: next.id,
          })),
        }),
      lockTake: (assetId, takeId) =>
        set({
          project: mapAsset(get().project, assetId, (asset) => ({
            ...asset,
            takes: asset.takes.map((item) => (item.id === takeId ? { ...item, locked: true } : item)),
          })),
        }),
      spendPlate: () => set({ project: { ...get().project, platesSpent: get().project.platesSpent + 1 } }),
      addAsset: (asset) =>
        set({
          project: {
            ...get().project,
            assets: [...get().project.assets, withThread(asset)],
            selectedId: asset.id,
          },
          pane: "mesa",
        }),
      rename: (id, name) =>
        set({
          project: mapAsset(get().project, id, (asset) => ({ ...asset, name: name.slice(0, 64) })),
        }),
      setLayer: (assetId, layerId, patch) =>
        set({
          project: mapAsset(get().project, assetId, (asset) => ({
            ...asset,
            scene: keepScene(asset, {
              layers: (asset.scene?.layers ?? []).map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)),
            }),
          })),
        }),
      placeLayer: (sceneId, layer) =>
        set({
          project: mapAsset(get().project, sceneId, (asset) => {
            const layers = asset.scene?.layers ?? [];
            const idx = layers.findIndex((item) => item.name === layer.name);
            const next =
              idx >= 0
                ? layers.map((item, i) => (i === idx ? { ...item, src: layer.src, name: layer.name } : item))
                : [...layers, layer];
            return { ...asset, scene: keepScene(asset, { layers: next }) };
          }),
        }),
      removeLayer: (sceneId, layerId) =>
        set({
          project: mapAsset(get().project, sceneId, (asset) => ({
            ...asset,
            scene: keepScene(asset, {
              layers: (asset.scene?.layers ?? []).filter((layer) => layer.id !== layerId),
            }),
          })),
        }),
      setBackgroundId: (sceneId, backgroundId) =>
        set({
          project: mapAsset(get().project, sceneId, (asset) => ({
            ...asset,
            scene: keepScene(asset, { backgroundId }),
          })),
        }),
      setBeats: (sceneId, beats) =>
        set({
          project: mapAsset(get().project, sceneId, (asset) => ({
            ...asset,
            scene: keepScene(asset, { beats, activeBeatId: beats[0]?.id ?? null }),
          })),
        }),
      stageBeat: (sceneId, beatId) =>
        set({
          project: (() => {
            const project = get().project;
            const scene = project.assets.find((item) => item.id === sceneId);
            const beat = scene?.scene?.beats.find((item) => item.id === beatId);
            if (!scene || !beat) return project;
            const person = project.assets.find((item) => item.id === beat.characterId) ?? project.assets.find((item) => item.kind === "personaje");
            const take =
              person?.takes.find((item) => item.view === beat.view) ??
              person?.takes.find((item) => item.view === "frente") ??
              person?.takes[0];
            const layers = scene.scene?.layers ?? [];
            const layerName = person?.name ?? layers[0]?.name;
            const idx = layers.findIndex((item) => item.name === layerName);
            const placed: SceneLayer = {
              id: idx >= 0 ? layers[idx].id : `lay-${nid()}`,
              name: layerName || "Cuerpo",
              src: take?.src ?? layers[idx]?.src ?? "",
              x: beat.x,
              y: beat.y,
              scale: beat.scale,
              flip: beat.flip,
            };
            const nextLayers = idx >= 0 ? layers.map((item, i) => (i === idx ? placed : item)) : [...layers, placed];
            let nextProject = mapAsset(project, sceneId, (asset) => ({
              ...asset,
              scene: keepScene(asset, { layers: nextLayers, activeBeatId: beatId }),
            }));
            if (person && take) {
              nextProject = mapAsset(nextProject, person.id, (asset) => ({ ...asset, activeTakeId: take.id }));
            }
            return nextProject;
          })(),
        }),
      lockBeat: (sceneId, beatId) =>
        set({
          project: mapAsset(get().project, sceneId, (asset) => ({
            ...asset,
            scene: keepScene(asset, {
              beats: (asset.scene?.beats ?? []).map((beat) => (beat.id === beatId ? { ...beat, status: "fijado" } : beat)),
            }),
          })),
        }),
      pushTrace: (trace) =>
        set({
          project: (() => {
            const project = get().project;
            const next: Trace = { ...trace, id: nid() };
            const selected = project.assets.find((item) => item.id === project.selectedId);
            if (!selected) {
              return { ...project, trace: [...project.trace, next].slice(-40) };
            }
            const base = selected.thread && selected.thread.length > 0 ? selected.thread : [];
            return mapAsset(project, selected.id, (asset) => ({
              ...asset,
              thread: [...base, next].slice(-80),
            }));
          })(),
        }),
      loadProject: (project) =>
        set({
          project: {
            ...project,
            assets: project.assets.map(withThread),
          },
          pane: "mesa",
          lastBrief: null,
        }),
      resetDemo: () => set({ project: seedProject(), pane: "mesa", lastBrief: null }),
    }),
    {
      name: "norma-desk-v5",
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

export function selectedAsset(project: DeskProject): Asset | undefined {
  return project.assets.find((asset) => asset.id === project.selectedId) ?? project.assets[0];
}

export function activeSrc(asset: Asset | undefined): string | null {
  if (!asset) return null;
  const take = asset.takes.find((item) => item.id === asset.activeTakeId) ?? asset.takes[0];
  return take?.src ?? null;
}

export { emptySpec, nid };
