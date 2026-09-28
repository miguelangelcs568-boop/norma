import type { Asset, Beat, DeskProject, ViewName } from "./types";

const ACT = ["entra", "llega", "aparece", "camina", "anda", "para", "detien", "espera", "mira", "observa", "agua", "sale", "va", "corre", "voltea", "gira"];

function nid() {
  return Math.random().toString(36).slice(2, 10);
}

export function isActing(text: string) {
  const t = text.toLowerCase();
  return ACT.some((word) => t.includes(word));
}

function viewFor(chunk: string): ViewName {
  if (/espalda|se va|sale/.test(chunk)) return "espalda";
  if (/mira|agua|observa|lado|perfil|camina|entra|llega/.test(chunk)) return "perfil";
  if (/para|detien|espera|frente/.test(chunk)) return "frente";
  return "frente";
}

function placeFor(chunk: string, index: number, total: number) {
  const t = index / Math.max(1, total - 1);
  if (/entra|llega|aparece/.test(chunk)) return { x: 0.08, y: 0.24, scale: 0.68, flip: false };
  if (/sale|se va/.test(chunk)) return { x: 0.72, y: 0.24, scale: 0.62, flip: true };
  if (/mira|agua/.test(chunk)) return { x: 0.58, y: 0.26, scale: 0.66, flip: false };
  if (/para|detien|espera/.test(chunk)) return { x: 0.38, y: 0.24, scale: 0.7, flip: false };
  return { x: 0.12 + t * 0.5, y: 0.24, scale: 0.68, flip: false };
}

function labelFor(chunk: string, index: number) {
  if (/entra|llega/.test(chunk)) return "Entra";
  if (/para|detien/.test(chunk)) return "Para";
  if (/mira|agua|observa/.test(chunk)) return "Mira";
  if (/sale|se va/.test(chunk)) return "Sale";
  if (/camina|anda/.test(chunk)) return "Camina";
  return `Pose ${index + 1}`;
}

function pickCharacter(text: string, project: DeskProject): Asset | undefined {
  const people = project.assets.filter((item) => item.kind === "personaje");
  const hit = people.find((item) => text.toLowerCase().includes(item.name.split(" ")[0]?.toLowerCase() ?? ""));
  return hit ?? people[0];
}

function chunksOf(said: string): string[] {
  const parts = said
    .toLowerCase()
    .split(/,| y | luego | despu[eé]s |;/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
  if (parts.length >= 2) return parts.slice(0, 6);
  const found = ACT.filter((word) => said.toLowerCase().includes(word));
  if (found.length >= 2) return found;
  return parts.length ? parts : [said.toLowerCase()];
}

export function planBeats(said: string, project: DeskProject): Beat[] {
  const person = pickCharacter(said, project);
  const bits = chunksOf(said);
  return bits.map((chunk, index) => {
    const place = placeFor(chunk, index, bits.length);
    return {
      id: nid(),
      label: labelFor(chunk, index),
      action: chunk.slice(0, 80),
      view: viewFor(chunk),
      characterId: person?.id ?? "",
      x: place.x,
      y: place.y,
      scale: place.scale,
      flip: place.flip,
      status: "borrador" as const,
    };
  });
}
