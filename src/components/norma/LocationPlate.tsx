import { useEffect, useRef, useState } from "react";
import { fovXRad, octaveCount } from "@/lib/norma/math";
import { biomeHint, drawSurvey, type SurveyColors } from "@/lib/norma/survey";
import type { LocationNode, Project } from "@/lib/norma/types";
import { BIOME_LABEL } from "@/lib/norma/types";
import { Button } from "./controls";
import { SheetFrame } from "./SheetFrame";

function deskColors(water: string, canopy: string): SurveyColors {
  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    ink: pick("--color-ink", "#1c1915"),
    sheet: pick("--color-sheet", "#fbf6ee"),
    accent: pick("--color-accent", "#c2412d"),
    water,
    canopy,
  };
}

export function LocationPlate({ project, node }: { project: Project; node: LocationNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const params = node.params;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const paint = () => {
      const width = Math.max(280, wrap.clientWidth);
      const height = 360;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pigments = project.bible.pigments;
      const shots = project.nodes.flatMap((item) =>
        item.kind === "plano" && item.shot.locationId === node.id ? [item] : [],
      );
      const people = project.nodes.flatMap((item) =>
        item.kind === "personaje" ? [{ name: item.name, heightM: item.metrics.heightCm / 100 }] : [],
      );
      drawSurvey(ctx, {
        width,
        height,
        params,
        zoom,
        doorM: project.bible.doorCm / 100,
        doorWidthM: project.bible.doorWidthM,
        colors: deskColors(pigments[3]?.hex ?? "#1a3338", pigments[2]?.hex ?? "#1e463c"),
        people,
        cameras: shots.map((shot) => ({
          name: shot.name,
          x: params.biome === "interior" ? params.metersWide * 0.5 : 0,
          y: params.biome === "interior" ? params.metersDeep * 0.82 : 10,
          distanceM: shot.shot.distanceM,
          fovRad: fovXRad(shot.shot.focalMm, project.bible.sensorMm),
        })),
      });
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [node.id, params, project, zoom]);

  return (
    <SheetFrame
      kicker={`${project.bible.title} · ${BIOME_LABEL[params.biome]}`}
      title={node.name}
      meta={`semilla ${params.seed || "—"}`}
    >
      <div ref={wrapRef} className="border border-line">
        <canvas ref={canvasRef} className="block h-96 w-full" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[1, 2, 4].map((value) => (
          <Button key={value} tone={zoom === value ? "ink" : "ghost"} onClick={() => setZoom(value)}>
            ×{value}
          </Button>
        ))}
        <Button
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `${node.name.replace(/\s+/g, "-").toLowerCase()}-lamina.png`;
            link.click();
          }}
        >
          Imprimir lámina
        </Button>
      </div>
      <p className="mt-3 font-mono text-xs text-pretty text-muted">
        {biomeHint(params.biome)} Zoom ×{zoom.toFixed(0)} reevalúa {octaveCount(zoom)} octavas. El archivo no
        crece.
      </p>
    </SheetFrame>
  );
}
