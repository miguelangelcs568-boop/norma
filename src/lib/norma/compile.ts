import {
  clamp,
  distanceForFraction,
  fingerprint,
  formatBytes,
  formatRatio,
  frameFraction,
  num,
  RASTER_PLATE,
  VIDEO_FRAMES,
} from "./math";
import type {
  CharacterNode,
  Gate,
  LocationNode,
  LockableNode,
  Project,
  Proposal,
  ShotNode,
  StepStatus,
  StudioNode,
} from "./types";
import { interiorIssues } from "./survey";

export function isLockable(node: StudioNode): node is LockableNode {
  return node.kind === "personaje" || node.kind === "locacion" || node.kind === "plano";
}

export function stepsFor(node: StudioNode): string[] {
  if (node.kind === "personaje") return ["metricas", "construccion", "boceto", "color"];
  if (node.kind === "locacion") return ["semilla", "relieve", "luz"];
  if (node.kind === "plano") return ["encuadre", "bloqueo"];
  return [];
}

export function findNode(project: Project, id: string): StudioNode | undefined {
  return project.nodes.find((n) => n.id === id);
}

export function characterById(project: Project, id: string): CharacterNode | undefined {
  const n = findNode(project, id);
  return n?.kind === "personaje" ? n : undefined;
}

export function locationById(project: Project, id: string): LocationNode | undefined {
  const n = findNode(project, id);
  return n?.kind === "locacion" ? n : undefined;
}

function metricCore(node: CharacterNode) {
  const m = node.metrics;
  return {
    heightCm: num(m.heightCm),
    heads: num(m.heads),
    shoulderY: num(m.shoulderY),
    hipY: num(m.hipY),
    shoulderW: num(m.shoulderW),
    eyeLine: num(m.eyeLine),
    arm: num(m.arm),
  };
}

export function stepInput(project: Project, nodeId: string, step: string): unknown {
  const node = findNode(project, nodeId);
  if (!node) return { missing: nodeId };
  if (node.kind === "personaje") {
    const base = metricCore(node);
    if (step === "metricas" || step === "construccion") return base;
    const draw = {
      ...base,
      lineWeight: num(node.metrics.lineWeight),
      asymmetry: num(node.metrics.asymmetry),
    };
    if (step === "boceto") return draw;
    return {
      ...draw,
      piel: node.metrics.piel,
      ropa: node.metrics.ropa,
      pelo: node.metrics.pelo,
      pigments: project.bible.pigments.map((p) => p.hex),
    };
  }
  if (node.kind === "locacion") {
    const p = node.params;
    if (step === "semilla") return { seed: p.seed };
    const relief = {
      seed: p.seed,
      biome: p.biome,
      elevation: num(p.elevation),
      moisture: num(p.moisture),
      metersWide: num(p.metersWide),
      metersDeep: num(p.metersDeep),
      ceilingM: num(p.ceilingM),
    };
    if (step === "relieve") return relief;
    return { ...relief, hour: num(p.hour) };
  }
  if (node.kind === "plano") {
    const shot = node.shot;
    const ch = characterById(project, shot.characterId);
    const loc = locationById(project, shot.locationId);
    return {
      characterId: shot.characterId,
      locationId: shot.locationId,
      distanceM: num(shot.distanceM),
      focalMm: num(shot.focalMm),
      tiltDeg: num(shot.tiltDeg),
      centered: shot.centered,
      heightCm: ch ? num(ch.metrics.heightCm) : null,
      heads: ch ? num(ch.metrics.heads) : null,
      locSeed: loc?.params.seed ?? null,
      biome: loc?.params.biome ?? null,
      hour: loc ? num(loc.params.hour) : null,
      metersWide: loc ? num(loc.params.metersWide) : null,
      ceilingM: loc ? num(loc.params.ceilingM) : null,
      doorCm: project.bible.doorCm,
      sensorMm: project.bible.sensorMm,
    };
  }
  return { kind: node.kind };
}

export function stepStatus(project: Project, node: LockableNode, step: string): StepStatus {
  const lock = node.locks.find((l) => l.step === step);
  if (!lock) return "abierto";
  const fp = fingerprint(stepInput(project, node.id, step));
  return lock.fingerprint === fp ? "firmado" : "sucio";
}

export function firstOpenStep(project: Project, node: LockableNode): string {
  const steps = stepsFor(node);
  for (const step of steps) {
    if (stepStatus(project, node, step) !== "firmado") return step;
  }
  return steps[steps.length - 1] ?? steps[0] ?? "";
}

export function nodeDirty(project: Project, node: StudioNode): boolean {
  if (!isLockable(node)) return false;
  return stepsFor(node).some((step) => stepStatus(project, node, step) === "sucio");
}

export function countDirty(project: Project): number {
  let n = 0;
  for (const node of project.nodes) {
    if (!isLockable(node)) continue;
    for (const step of stepsFor(node)) {
      if (stepStatus(project, node, step) === "sucio") n += 1;
    }
  }
  return n;
}

export function canLock(project: Project, node: LockableNode, step: string): boolean {
  const steps = stepsFor(node);
  const index = steps.indexOf(step);
  if (index < 0) return false;
  if (index > 0) {
    const prev = steps[index - 1];
    if (!prev || stepStatus(project, node, prev) !== "firmado") return false;
  }
  return gatesFor(project, node, step).every((g) => g.level !== "falla");
}

export function characterGates(project: Project, node: CharacterNode): Gate[] {
  const m = node.metrics;
  const gates: Gate[] = [];
  if (m.hipY <= m.shoulderY + 0.08) {
    gates.push({ level: "falla", text: "La cadera cruzó el hombro. La proporción no cierra." });
  }
  if (m.heads > 8) {
    gates.push({
      level: "falla",
      text: "Por encima de 8 cabezas esto es catálogo. La norma no lo firma.",
    });
  } else if (m.heads > 7.5) {
    gates.push({
      level: "aviso",
      text: "La biblia de este corto pide máximo 7.5 cabezas.",
    });
  } else {
    gates.push({
      level: "ok",
      text: `${m.heads.toFixed(1)} cabezas sobre ${Math.round(m.heightCm)} cm.`,
    });
  }
  if (m.heightCm > project.bible.doorCm + 8) {
    gates.push({
      level: "aviso",
      text: `Mide más que la puerta de ${project.bible.doorCm} cm. Revísalo a propósito.`,
    });
  }
  return gates;
}

export function locationGates(project: Project, node: LocationNode, step: string): Gate[] {
  const p = node.params;
  const gates: Gate[] = [];
  if (step === "semilla") {
    if (p.seed.length < 4) {
      gates.push({ level: "falla", text: "Semilla demasiado corta. Sin ella el lugar no es repetible." });
    } else {
      gates.push({ level: "ok", text: `Semilla ${p.seed}. El mapa no está guardado.` });
    }
    return gates;
  }
  if (p.metersWide < 4) {
    gates.push({ level: "falla", text: "Menos de 4 m de ancho. No cabe una acción." });
  }
  if (p.biome === "interior") {
    const doorM = project.bible.doorCm / 100;
    if (p.ceilingM < doorM) {
      gates.push({
        level: "falla",
        text: `Dintel ${p.ceilingM.toFixed(2)} m. La puerta de la biblia mide ${doorM.toFixed(2)} m.`,
      });
    } else {
      gates.push({
        level: "ok",
        text: `Altura libre ${p.ceilingM.toFixed(2)} m. La puerta de ${doorM.toFixed(2)} m entra.`,
      });
    }
    for (const issue of interiorIssues(p, project.bible.doorWidthM)) {
      gates.push({ level: "falla", text: issue });
    }
  } else if (step === "relieve") {
    gates.push({
      level: "ok",
      text: "El relieve es z = (ruido − 0.5) × elevación × 12 m.",
    });
  }
  if (step === "luz") {
    if (p.hour < 15) {
      gates.push({
        level: "aviso",
        text: "La biblia pide luz del oeste después de las 15:00.",
      });
    } else {
      gates.push({ level: "ok", text: `Hora ${formatHour(p.hour)}. Coincide con el oeste.` });
    }
  }
  return gates;
}

export function shotGates(project: Project, node: ShotNode): Gate[] {
  const shot = node.shot;
  const ch = characterById(project, shot.characterId);
  const loc = locationById(project, shot.locationId);
  const gates: Gate[] = [];
  if (!ch) {
    gates.push({ level: "falla", text: "Este plano no tiene personaje. No se inventa uno." });
    return gates;
  }
  if (!loc) {
    gates.push({ level: "falla", text: "Este plano no tiene locación." });
    return gates;
  }
  const heightM = ch.metrics.heightCm / 100;
  const doorM = project.bible.doorCm / 100;
  const frac = frameFraction(shot.focalMm, heightM, shot.distanceM, project.bible.sensorMm);
  const doorFrac = frameFraction(shot.focalMm, doorM, shot.distanceM, project.bible.sensorMm);
  const pct = Math.round(frac * 100);
  if (frac > 0.9) {
    gates.push({ level: "falla", text: `Ocupa ${pct}% del alto. El cuerpo no cabe.` });
  } else if (frac < 0.12) {
    gates.push({
      level: "falla",
      text: `Ocupa ${pct}% del alto. Se pierde. Acerca o alarga el lente.`,
    });
  } else {
    gates.push({ level: "ok", text: `${ch.name} ocupa ${pct}% del alto del cuadro.` });
  }
  const real = doorM / heightM;
  const seen = frac === 0 ? 0 : doorFrac / frac;
  gates.push({
    level: "ok",
    text: `Puerta ${project.bible.doorCm} cm. Relación real ${real.toFixed(2)}, en cuadro ${seen.toFixed(2)}.`,
  });
  if (shot.focalMm < 22 && shot.distanceM < 1.6) {
    gates.push({
      level: "falla",
      text: "Gran angular demasiado cerca. La cabeza se deforma.",
    });
  }
  if (Math.abs(shot.tiltDeg) > 12) {
    gates.push({
      level: "aviso",
      text: "Inclinación fuerte. La biblia la reserva para un plano de poder.",
    });
  }
  if (shot.centered) {
    gates.push({
      level: "aviso",
      text: "Personaje centrado. Úsalo solo si el plano es de poder.",
    });
  }
  if (ch.metrics.heads > 7.5) {
    gates.push({ level: "aviso", text: `${ch.name} sigue por encima de 7.5 cabezas.` });
  }
  if (loc.params.hour < 15) {
    gates.push({ level: "aviso", text: `${loc.name} no tiene la luz oeste de la biblia.` });
  }
  return gates;
}

export function gatesFor(project: Project, node: LockableNode, step: string): Gate[] {
  if (node.kind === "personaje") {
    if (step === "metricas") return characterGates(project, node);
    if (step === "construccion") {
      return [{ level: "ok", text: "Frente y perfil salen de los mismos números. No hay un segundo dibujo." }];
    }
    if (step === "boceto") {
      return [
        {
          level: "ok",
          text: "La asimetría es un número. Un rostro espejo no se firma.",
        },
      ];
    }
    return [{ level: "ok", text: "Solo pigmentos de la biblia. No hay un cuarto color." }];
  }
  if (node.kind === "locacion") return locationGates(project, node, step);
  if (step === "bloqueo") {
    const enc = stepStatus(project, node, "encuadre");
    if (enc !== "firmado") {
      return [{ level: "falla", text: "El encuadre no está firmado." }, ...shotGates(project, node)];
    }
  }
  return shotGates(project, node);
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function storedBytes(project: Project): number {
  return new TextEncoder().encode(JSON.stringify(project)).length;
}

export function costReport(project: Project) {
  const stored = storedBytes(project);
  const plates = project.nodes.filter(
    (n) => n.kind === "personaje" || n.kind === "locacion" || n.kind === "plano",
  ).length;
  const shots = project.nodes.filter((n) => n.kind === "plano").length;
  const plateBytes = plates * RASTER_PLATE;
  const videoBytes = shots * VIDEO_FRAMES * RASTER_PLATE;
  return {
    stored,
    plates,
    shots,
    plateBytes,
    videoBytes,
    dirty: countDirty(project),
    ratio: formatRatio(stored, videoBytes),
    storedLabel: formatBytes(stored),
    plateLabel: formatBytes(plateBytes),
    videoLabel: formatBytes(videoBytes),
  };
}

const RANGES: Record<string, [number, number]> = {
  heads: [5.5, 7.6],
  shoulderY: [0.14, 0.28],
  hipY: [0.4, 0.56],
  shoulderW: [0.18, 0.36],
  eyeLine: [0.38, 0.6],
  arm: [0.28, 0.48],
  lineWeight: [0.8, 3.2],
  asymmetry: [0.02, 0.16],
  elevation: [0.05, 1],
  moisture: [0, 1],
  metersWide: [6, 240],
  metersDeep: [4, 80],
  ceilingM: [2.1, 6],
  hour: [0, 24],
  distanceM: [0.8, 40],
  focalMm: [18, 85],
  tiltDeg: [-20, 35],
};

const STEP_KEYS: Record<string, string[]> = {
  metricas: ["heads", "shoulderY", "hipY", "shoulderW", "eyeLine", "arm"],
  boceto: ["lineWeight", "asymmetry"],
  relieve: ["elevation", "moisture", "metersWide", "metersDeep", "ceilingM"],
  luz: ["hour"],
  encuadre: ["distanceM", "focalMm", "tiltDeg"],
};

export function localProposal(project: Project, node: LockableNode, step: string): Proposal | null {
  const keys = STEP_KEYS[step];
  if (!keys) return null;
  if (node.kind === "personaje" && step === "metricas") {
    let heads = 6.6;
    for (const d of project.decisions) {
      if (d.nodeId !== node.id || d.verb !== "rechazar") continue;
      const rejected = d.fields.heads;
      if (typeof rejected === "number") heads = rejected >= heads ? rejected - 0.5 : rejected + 0.4;
    }
    heads = clamp(heads, 5.6, 7.4);
    const shoulderY = clamp(0.2 + (7 - heads) * 0.008, 0.16, 0.24);
    const hipY = clamp(0.47 + (heads - 6.6) * 0.01, 0.44, 0.52);
    return {
      source: "matematica",
      note: `${heads.toFixed(1)} cabezas. Lejos de lo ya rechazado. Hombro y cadera salen de esa proporción.`,
      fields: {
        heads: num(heads),
        shoulderY: num(shoulderY),
        hipY: num(hipY),
        shoulderW: 0.25,
        eyeLine: heads < 7 ? 0.52 : 0.48,
        arm: 0.4,
      },
    };
  }
  if (node.kind === "personaje" && step === "boceto") {
    return {
      source: "matematica",
      note: "Peso de línea 1.8 y asimetría 0.07. Lo justo para que el rostro no sea un espejo.",
      fields: { lineWeight: 1.8, asymmetry: 0.07 },
    };
  }
  if (node.kind === "locacion" && step === "relieve") {
    const biome = node.params.biome;
    const fields =
      biome === "interior"
        ? { elevation: 0.2, moisture: 0.3, metersWide: 12, metersDeep: 9, ceilingM: 2.7 }
        : biome === "salar"
          ? { elevation: 0.15, moisture: 0.08, metersWide: 120, metersDeep: 80, ceilingM: 2.7 }
          : biome === "estero"
            ? { elevation: 0.42, moisture: 0.66, metersWide: 80, metersDeep: 54, ceilingM: 2.7 }
            : { elevation: 0.55, moisture: 0.4, metersWide: 64, metersDeep: 48, ceilingM: 2.7 };
    return {
      source: "matematica",
      note: "Parámetros de casa para este bioma. La semilla no se toca.",
      fields,
    };
  }
  if (node.kind === "locacion" && step === "luz") {
    return {
      source: "matematica",
      note: "16:30. Entra en la regla de luz oeste sin mover el terreno.",
      fields: { hour: 16.5 },
    };
  }
  if (node.kind === "plano" && step === "encuadre") {
    const ch = characterById(project, node.shot.characterId);
    if (!ch) return null;
    const focal = node.shot.focalMm || project.bible.focalMm;
    const distance = distanceForFraction(
      focal,
      ch.metrics.heightCm / 100,
      0.46,
      project.bible.sensorMm,
    );
    return {
      source: "matematica",
      note: `Plano medio: d = f · H / (0.46 · sensor). Sale ${distance.toFixed(2)} m. Cero píxeles.`,
      fields: { distanceM: num(clamp(distance, 0.8, 40)), focalMm: focal, tiltDeg: 0 },
    };
  }
  return null;
}

export function vetProposal(
  project: Project,
  node: LockableNode,
  step: string,
  raw: Record<string, unknown>,
): { ok: true; proposal: Proposal } | { ok: false; reason: string } {
  if ("heightCm" in raw) {
    return { ok: false, reason: "El modelo intentó cambiar la estatura. Eso no se negocia por texto." };
  }
  if ("seed" in raw || "biome" in raw) {
    return { ok: false, reason: "El modelo intentó cambiar la semilla o el bioma." };
  }
  const keys = STEP_KEYS[step];
  if (!keys) return { ok: false, reason: "Este paso no acepta números de un modelo." };
  const fields: Record<string, number> = {};
  for (const key of keys) {
    const rawValue = raw[key];
    const value =
      typeof rawValue === "number"
        ? rawValue
        : typeof rawValue === "string" && rawValue.trim() !== "" && !Number.isNaN(Number(rawValue))
          ? Number(rawValue)
          : rawValue;
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { ok: false, reason: `Falta o no es número: ${key}.` };
    }
    const range = RANGES[key];
    if (!range) return { ok: false, reason: `Sin rango para ${key}.` };
    if (value < range[0] || value > range[1]) {
      return {
        ok: false,
        reason: `${key} = ${value} está fuera de ${range[0]}–${range[1]}. La norma lo rechaza.`,
      };
    }
    fields[key] = num(value);
  }
  if (step === "metricas" && fields.hipY !== undefined && fields.shoulderY !== undefined) {
    if (fields.hipY <= fields.shoulderY + 0.08) {
      return { ok: false, reason: "La cadera quedó encima del hombro." };
    }
  }
  if (step === "encuadre" && node.kind === "plano") {
    const ch = characterById(project, node.shot.characterId);
    if (!ch) return { ok: false, reason: "No hay personaje para comprobar el encuadre." };
    const frac = frameFraction(
      fields.focalMm ?? node.shot.focalMm,
      ch.metrics.heightCm / 100,
      fields.distanceM ?? node.shot.distanceM,
      project.bible.sensorMm,
    );
    if (frac < 0.12 || frac > 0.9) {
      return {
        ok: false,
        reason: `El encuadre dejaría al personaje en ${Math.round(frac * 100)}% del cuadro.`,
      };
    }
  }
  const note = typeof raw.nota === "string" ? raw.nota.slice(0, 140) : "Números dentro de la norma.";
  return { ok: true, proposal: { source: "modelo", note, fields } };
}

export function buildBrief(project: Project, node: LockableNode, step: string): string {
  const rejected = project.decisions
    .filter((d) => d.nodeId === node.id && d.verb === "rechazar")
    .slice(-6)
    .map((d) => `- ${d.note}`)
    .join("\n");
  const keys = STEP_KEYS[step] ?? [];
  const shape = keys.map((k) => {
    const range = RANGES[k];
    return range ? `${k} (${range[0]} a ${range[1]})` : k;
  });
  return [
    `Proyecto: ${project.bible.title}.`,
    `Nodo: ${node.name}. Paso: ${step}.`,
    `No cambies estatura, semilla ni bioma.`,
    `Devuelve solo JSON con estas claves y una "nota" de máximo 18 palabras: ${shape.join(", ")}.`,
    rejected ? `Ya rechazado en este nodo:\n${rejected}` : "No hay rechazos previos.",
    `Entrada actual: ${JSON.stringify(stepInput(project, node.id, step))}`,
  ].join("\n");
}

export function stamp(project: Project, nodeId: string, steps: string[]): Project {
  return {
    ...project,
    nodes: project.nodes.map((node) => {
      if (node.id !== nodeId || !isLockable(node)) return node;
      const locks = steps.map((step) => ({
        step,
        fingerprint: fingerprint(stepInput(project, nodeId, step)),
      }));
      return { ...node, locks };
    }),
  };
}
