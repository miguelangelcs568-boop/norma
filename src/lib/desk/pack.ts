import { getBlob, putBlob } from "./idb";
import { dataUrlToBlob } from "./images";
import type { DeskProject } from "./types";

const KIND = "norma-desk-pack-v1";

type Pack = {
  kind: typeof KIND;
  savedAt: string;
  project: DeskProject;
  blobs: Record<string, string>;
};

function idsFrom(project: DeskProject): string[] {
  const ids = new Set<string>();
  for (const asset of project.assets) {
    for (const take of asset.takes) {
      if (take.src.startsWith("idb:")) ids.add(take.src.slice(4));
    }
    for (const layer of asset.scene?.layers ?? []) {
      if (layer.src.startsWith("idb:")) ids.add(layer.src.slice(4));
    }
  }
  return [...ids];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la lamina"));
    reader.readAsDataURL(blob);
  });
}

export async function packProject(project: DeskProject): Promise<Pack> {
  const blobs: Record<string, string> = {};
  for (const id of idsFrom(project)) {
    const blob = await getBlob(id);
    if (blob) blobs[id] = await blobToDataUrl(blob);
  }
  return { kind: KIND, savedAt: new Date().toISOString(), project, blobs };
}

export async function unpackProject(raw: unknown): Promise<DeskProject> {
  const pack = raw as Pack;
  if (!pack || pack.kind !== KIND || !pack.project || !pack.project.assets) {
    throw new Error("Ese archivo no es un corto de NORMA.");
  }
  for (const [id, dataUrl] of Object.entries(pack.blobs ?? {})) {
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
      await putBlob(id, dataUrlToBlob(dataUrl));
    }
  }
  return pack.project;
}

export function downloadPack(pack: Pack) {
  const name = `${pack.project.title.replace(/\s+/g, "-").toLowerCase() || "norma"}.norma.json`;
  const blob = new Blob([JSON.stringify(pack)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readPackFile(file: File): Promise<DeskProject> {
  const text = await file.text();
  return unpackProject(JSON.parse(text));
}
