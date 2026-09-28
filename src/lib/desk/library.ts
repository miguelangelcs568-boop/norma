import { emptyProject, seedProject } from "./store";
import type { DeskProject } from "./types";

const KEY = "norma-desk-shelf-v1";

export type ShelfItem = {
  id: string;
  title: string;
  updatedAt: string;
  demo?: boolean;
  project: DeskProject;
};

export type Shelf = {
  currentId: string;
  items: ShelfItem[];
};

function nid() {
  return Math.random().toString(36).slice(2, 10);
}

function stamp(project: DeskProject, id: string, demo?: boolean): ShelfItem {
  return {
    id,
    title: project.title || "Sin título",
    updatedAt: new Date().toISOString(),
    demo,
    project,
  };
}

export function loadShelf(): Shelf | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Shelf;
    if (!parsed || !Array.isArray(parsed.items) || !parsed.currentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveShelf(shelf: Shelf) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(shelf));
}

export function bootShelf(current: DeskProject): Shelf {
  const existing = loadShelf();
  if (existing && existing.items.length > 0) {
    const has = existing.items.some((item) => item.id === existing.currentId);
    return has ? existing : { ...existing, currentId: existing.items[0].id };
  }
  const seeded = current.title === "La sal de Punta Palma" || current.assets.some((item) => item.id === "lina");
  const id = seeded ? "palma" : nid();
  const shelf: Shelf = {
    currentId: id,
    items: [stamp(current, id, seeded)],
  };
  saveShelf(shelf);
  return shelf;
}

export function remember(shelf: Shelf, project: DeskProject): Shelf {
  const next: Shelf = {
    currentId: shelf.currentId,
    items: shelf.items.map((item) => (item.id === shelf.currentId ? stamp(project, item.id, item.demo) : item)),
  };
  if (!next.items.some((item) => item.id === next.currentId)) {
    const id = nid();
    next.items = [stamp(project, id), ...next.items];
    next.currentId = id;
  }
  saveShelf(next);
  return next;
}

export function openOnShelf(shelf: Shelf, id: string, current: DeskProject): { shelf: Shelf; project: DeskProject } | null {
  const saved = remember(shelf, current);
  const hit = saved.items.find((item) => item.id === id);
  if (!hit) return null;
  const next = { ...saved, currentId: id };
  saveShelf(next);
  return { shelf: next, project: hit.project };
}

export function addBlank(shelf: Shelf, current: DeskProject): { shelf: Shelf; project: DeskProject } {
  const saved = remember(shelf, current);
  const project = emptyProject();
  const id = nid();
  const next: Shelf = {
    currentId: id,
    items: [stamp(project, id), ...saved.items],
  };
  saveShelf(next);
  return { shelf: next, project };
}

export function addDemo(shelf: Shelf, current: DeskProject): { shelf: Shelf; project: DeskProject } {
  const saved = remember(shelf, current);
  const found = saved.items.find((item) => item.demo || item.id === "palma");
  if (found) {
    const next = { ...saved, currentId: found.id };
    saveShelf(next);
    return { shelf: next, project: found.project.title === "La sal de Punta Palma" ? found.project : seedProject() };
  }
  const project = seedProject();
  const next: Shelf = {
    currentId: "palma",
    items: [...saved.items, stamp(project, "palma", true)],
  };
  saveShelf(next);
  return { shelf: next, project };
}

export function dropFromShelf(shelf: Shelf, id: string): Shelf {
  if (shelf.items.length <= 1) return shelf;
  const items = shelf.items.filter((item) => item.id !== id);
  const currentId = shelf.currentId === id ? items[0].id : shelf.currentId;
  const next = { currentId, items };
  saveShelf(next);
  return next;
}

export function whenOf(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  return `Hace ${days} d`;
}
