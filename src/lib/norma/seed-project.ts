import { stamp } from "./compile";
import type { Project, StudioNode } from "./types";

export const ID = {
  bible: "biblia",
  personas: "carp-personas",
  principales: "carp-principales",
  extras: "carp-extras",
  locaciones: "carp-loc",
  secuencias: "carp-seq",
  lina: "lina",
  don: "don",
  estero: "estero",
  casa: "casa",
  seq1: "seq-010",
  seq2: "seq-020",
  pl010: "pl-010",
  pl020: "pl-020",
  pl030: "pl-030",
} as const;

function baseBible() {
  return {
    title: "La sal de Punta Palma",
    logline: "Lina vuelve a medir el estero que el mar se está comiendo. La puerta de la casa sigue midiendo lo mismo.",
    seed: "A4F219C7",
    doorCm: 205,
    doorWidthM: 0.9,
    focalMm: 35,
    sensorMm: 36,
    pigments: [
      { name: "sal", hex: "#e4d5bc" },
      { name: "óxido", hex: "#a33b24" },
      { name: "mangle", hex: "#1e463c" },
      { name: "agua", hex: "#1a3338" },
    ],
    never: [
      "No centrar al personaje salvo plano de poder",
      "No inventar un pigmento fuera de esta lista",
      "No pasar de 7.5 cabezas",
      "La luz viene del oeste después de las 15:00",
    ],
  };
}

export function createDemoProject(): Project {
  const nodes: StudioNode[] = [
    { id: ID.bible, parentId: null, kind: "biblia", name: "00 Biblia" },
    {
      id: ID.personas,
      parentId: null,
      kind: "carpeta",
      name: "01 Personajes",
      brief: "Nadie entra al plano sin estatura firmada.",
    },
    {
      id: ID.principales,
      parentId: ID.personas,
      kind: "carpeta",
      name: "Principales",
      brief: "Los que cargan el corto.",
    },
    {
      id: ID.extras,
      parentId: ID.personas,
      kind: "carpeta",
      name: "Extras",
      brief: "Vacía a propósito. Un extra es una carpeta, no un prompt.",
    },
    {
      id: ID.lina,
      parentId: ID.principales,
      kind: "personaje",
      name: "Lina Vives",
      locks: [],
      metrics: {
        heightCm: 161,
        heads: 6.6,
        shoulderY: 0.19,
        hipY: 0.48,
        shoulderW: 0.26,
        eyeLine: 0.5,
        arm: 0.41,
        lineWeight: 1.7,
        asymmetry: 0.07,
        piel: 0,
        ropa: 2,
        pelo: 3,
      },
    },
    {
      id: ID.don,
      parentId: ID.principales,
      kind: "personaje",
      name: "Don Estero",
      locks: [],
      metrics: {
        heightCm: 178,
        heads: 7.2,
        shoulderY: 0.18,
        hipY: 0.47,
        shoulderW: 0.28,
        eyeLine: 0.48,
        arm: 0.4,
        lineWeight: 1.4,
        asymmetry: 0.05,
        piel: 0,
        ropa: 1,
        pelo: 3,
      },
    },
    {
      id: ID.locaciones,
      parentId: null,
      kind: "carpeta",
      name: "02 Locaciones",
      brief: "Cada lugar es una semilla y unos metros. No una imagen.",
    },
    {
      id: ID.estero,
      parentId: ID.locaciones,
      kind: "locacion",
      name: "Estero norte",
      locks: [],
      params: {
        seed: "A4F219C7",
        biome: "estero",
        elevation: 0.46,
        moisture: 0.64,
        hour: 16.5,
        metersWide: 80,
        metersDeep: 54,
        ceilingM: 2.7,
      },
    },
    {
      id: ID.casa,
      parentId: ID.locaciones,
      kind: "locacion",
      name: "Casa de sal",
      locks: [],
      params: {
        seed: "C7A4F219",
        biome: "interior",
        elevation: 0.2,
        moisture: 0.3,
        hour: 16.5,
        metersWide: 12,
        metersDeep: 9,
        ceilingM: 2.7,
      },
    },
    {
      id: ID.secuencias,
      parentId: null,
      kind: "carpeta",
      name: "03 Secuencias",
      brief: "El corto se parte en bloques antes de pedir un solo cuadro.",
    },
    {
      id: ID.seq1,
      parentId: ID.secuencias,
      kind: "secuencia",
      name: "SEQ 010 Llegada",
      intent: "Lina baja al estero con la cinta. El paisaje ya estaba. Ella no.",
    },
    {
      id: ID.pl010,
      parentId: ID.seq1,
      kind: "plano",
      name: "PL 010 Umbral",
      locks: [],
      shot: {
        characterId: ID.lina,
        locationId: ID.estero,
        distanceM: 4.8,
        focalMm: 35,
        tiltDeg: 0,
        centered: false,
      },
    },
    {
      id: ID.pl020,
      parentId: ID.seq1,
      kind: "plano",
      name: "PL 020 Medición",
      locks: [],
      shot: {
        characterId: ID.lina,
        locationId: ID.estero,
        distanceM: 22,
        focalMm: 35,
        tiltDeg: 0,
        centered: false,
      },
    },
    {
      id: ID.seq2,
      parentId: ID.secuencias,
      kind: "secuencia",
      name: "SEQ 020 Oficio",
      intent: "Don Estero en la casa. La puerta es la escala, no un adorno.",
    },
    {
      id: ID.pl030,
      parentId: ID.seq2,
      kind: "plano",
      name: "PL 030 Mesa",
      locks: [],
      shot: {
        characterId: ID.don,
        locationId: ID.casa,
        distanceM: 4.2,
        focalMm: 40,
        tiltDeg: 2,
        centered: false,
      },
    },
  ];

  let project: Project = {
    version: 1,
    bible: baseBible(),
    nodes,
    decisions: [
      {
        id: "d-catalogo",
        at: 1_758_000_000_000,
        nodeId: ID.lina,
        verb: "rechazar",
        note: "8 cabezas. Se ve de catálogo, no de este corto.",
        fields: { heads: 8 },
      },
    ],
    modelCalls: 0,
    selectedId: ID.pl010,
  };

  project = stamp(project, ID.lina, ["metricas", "construccion", "boceto", "color"]);
  project = stamp(project, ID.don, ["metricas", "construccion", "boceto"]);
  project = stamp(project, ID.estero, ["semilla", "relieve", "luz"]);
  project = stamp(project, ID.casa, ["semilla"]);
  project = stamp(project, ID.pl010, ["encuadre"]);
  return project;
}

export function createBlankProject(): Project {
  const project: Project = {
    version: 1,
    bible: {
      ...baseBible(),
      title: "Proyecto sin título",
      logline: "Escribe qué se está midiendo. Sin eso no hay plano.",
      seed: "B1C0A4E2",
    },
    nodes: [
      { id: "biblia", parentId: null, kind: "biblia", name: "00 Biblia" },
      {
        id: "carp-personas",
        parentId: null,
        kind: "carpeta",
        name: "01 Personajes",
        brief: "",
      },
      {
        id: "carp-loc",
        parentId: null,
        kind: "carpeta",
        name: "02 Locaciones",
        brief: "",
      },
      {
        id: "carp-seq",
        parentId: null,
        kind: "carpeta",
        name: "03 Secuencias",
        brief: "",
      },
    ],
    decisions: [],
    modelCalls: 0,
    selectedId: "biblia",
  };
  return project;
}
