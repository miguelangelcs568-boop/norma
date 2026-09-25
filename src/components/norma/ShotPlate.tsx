import { frameFraction, imageHeightMm, sensorHeightMm } from "@/lib/norma/math";
import { characterById, locationById, shotGates } from "@/lib/norma/compile";
import type { Project, ShotNode } from "@/lib/norma/types";
import { useStudio } from "@/lib/norma/store";
import { Stamp } from "./controls";
import { SheetFrame } from "./SheetFrame";

export function ShotPlate({ project, node }: { project: Project; node: ShotNode }) {
  const select = useStudio((s) => s.select);
  const shot = node.shot;
  const character = characterById(project, shot.characterId);
  const location = locationById(project, shot.locationId);
  const heightM = (character?.metrics.heightCm ?? 170) / 100;
  const doorM = project.bible.doorCm / 100;
  const frac = frameFraction(shot.focalMm, heightM, shot.distanceM, project.bible.sensorMm);
  const doorFrac = frameFraction(shot.focalMm, doorM, shot.distanceM, project.bible.sensorMm);
  const image = imageHeightMm(shot.focalMm, heightM, shot.distanceM);
  const gates = shotGates(project, node);
  const left = shot.centered ? "42%" : "22%";
  const body = Math.min(96, Math.max(4, frac * 100));
  const door = Math.min(96, Math.max(4, doorFrac * 100));

  return (
    <SheetFrame kicker={`${project.bible.title} · plano`} title={node.name} meta={`${shot.focalMm} mm · ${shot.distanceM.toFixed(1)} m`}>
      <div className="relative aspect-video w-full overflow-hidden bg-ink">
        <div className="absolute inset-x-6 bottom-[8%] h-px bg-sheet opacity-60" />
        <svg
          viewBox="0 0 40 120"
          preserveAspectRatio="xMidYMax meet"
          className="absolute bottom-[8%] text-sheet"
          style={{ left, height: `${body}%`, width: `${Math.max(body * 0.2, 4)}%` }}
          aria-hidden
        >
          <circle cx="20" cy="14" r="10" fill="currentColor" />
          <path d="M8 30 H32 L28 70 H12 Z" fill="currentColor" />
          <path d="M14 70 L10 112 H18 L20 86 L22 112 H30 L26 70" fill="currentColor" />
        </svg>
        <div
          className="absolute right-[16%] bottom-[8%] border border-accent"
          style={{ height: `${door}%`, width: "3%" }}
        />
        <p className="absolute top-3 left-3 font-mono text-xs text-sheet">
          {character?.name ?? "sin personaje"} · {Math.round(frac * 100)}%
        </p>
        <p className="absolute right-3 bottom-3 font-mono text-xs text-accent">puerta</p>
      </div>
      <p className="mt-3 font-mono text-xs text-pretty text-muted">
        El cuadro es la fórmula, no un render. Para mover la cámara, reabre Encuadre: cambia metros, no píxeles.
      </p>
      <p className="mt-2 font-mono text-xs text-pretty text-ink tabular-nums">
        h' = f · H / d = {shot.focalMm} · {heightM.toFixed(2)} / {shot.distanceM.toFixed(2)} ={" "}
        {Number.isFinite(image) ? image.toFixed(1) : "∞"} mm · sensor {sensorHeightMm(project.bible.sensorMm).toFixed(0)} mm
      </p>
      <div className="mt-2 space-y-1">
        {gates.map((gate) => (
          <Stamp key={gate.text} tone={gate.level}>
            {gate.text}
          </Stamp>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {character && (
          <button type="button" className="h-11 px-2 font-mono text-xs text-ink underline" onClick={() => select(character.id)}>
            Abrir {character.name}
          </button>
        )}
        {location && (
          <button type="button" className="h-11 px-2 font-mono text-xs text-ink underline" onClick={() => select(location.id)}>
            Abrir {location.name}
          </button>
        )}
      </div>
    </SheetFrame>
  );
}
