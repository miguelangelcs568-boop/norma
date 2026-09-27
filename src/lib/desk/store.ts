import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Brief } from "./brief";
import type { Asset, DeskProject, SceneLayer, Spec, Take, Trace, ViewName } from "./types";

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
  };
  const escena: Asset = {
    id: "pl-010",
    kind: "escena",
    name: "PL 010 Umbral",
    spec: {
      ...emptySpec(),
      notes: "Lina sobre el estero. Moverla cuesta 0 láminas.",
    },
    takes: [],
    activeTakeId: null,
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
    },
  };
  return {
    title: "La sal de Punta Palma",
    assets: [lina, estero, escena],
    selectedId: "lina",
    platesSpent: 0,
    trace: [
      {
        id: "t0",
        role: "director",
        text: "Dime una frase. «perfil» reusa a Lina. «quiero un personaje alto con traje» abre ficha nueva y pide el frente. No pintamos el capítulo.",
      },
    ],
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
  pushTrace: (trace: Omit<Trace, "id">) => void;
  resetDemo: () => void;
};

function mapAsset(project: DeskProject, id: string, fn: (asset: Asset) => Asset): DeskProject {
  return { ...project, assets: project.assets.map((asset) => (asset.id === id ? fn(asset) : asset)) };
}

function nid(): string {
  return Math.random().toString(36).slice(2, 10);
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
          project: { ...get().project, assets: [...get().project.assets, asset], selectedId: asset.id },
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
            scene: {
              backgroundId: asset.scene?.backgroundId,
              layers: (asset.scene?.layers ?? []).map((layer) =>
                layer.id === layerId ? { ...layer, ...patch } : layer,
              ),
            },
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
            return { ...asset, scene: { backgroundId: asset.scene?.backgroundId, layers: next } };
          }),
        }),
      removeLayer: (sceneId, layerId) =>
        set({
          project: mapAsset(get().project, sceneId, (asset) => ({
            ...asset,
            scene: {
              backgroundId: asset.scene?.backgroundId,
              layers: (asset.scene?.layers ?? []).filter((layer) => layer.id !== layerId),
            },
          })),
        }),
      setBackgroundId: (sceneId, backgroundId) =>
        set({
          project: mapAsset(get().project, sceneId, (asset) => ({
            ...asset,
            scene: { backgroundId, layers: asset.scene?.layers ?? [] },
          })),
        }),
      pushTrace: (trace) =>
        set({
          project: {
            ...get().project,
            trace: [...get().project.trace, { ...trace, id: nid() }].slice(-40),
          },
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
