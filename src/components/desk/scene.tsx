import { useRef, useState, type PointerEvent } from "react";
import { Film, FlipHorizontal, Pause, Play, Plus } from "lucide-react";
import { Button, Field } from "@/components/desk/controls";
import { useCutout, useResolvedSrc } from "@/components/desk/media";
import { exportReel } from "@/lib/desk/export-reel";
import { beatMs } from "@/lib/desk/partitura";
import { openNextShot, playReel, playShot, shotsOf } from "@/lib/desk/reel";
import { activeSrc, useDesk } from "@/lib/desk/store";
import { VIEW_LABEL, type Asset, type Beat, type SceneLayer } from "@/lib/desk/types";

function setBeatMs(sceneId: string, beatId: string, ms: number) {
  useDesk.setState((state) => ({
    project: {
      ...state.project,
      assets: state.project.assets.map((asset) => {
        if (asset.id !== sceneId) return asset;
        return {
          ...asset,
          scene: {
            backgroundId: asset.scene?.backgroundId,
            layers: asset.scene?.layers ?? [],
            beats: (asset.scene?.beats ?? []).map((beat) => (beat.id === beatId ? { ...beat, ms } : beat)),
            activeBeatId: asset.scene?.activeBeatId ?? null,
          },
        };
      }),
    },
  }));
}

export function SceneBoard({ asset }: { asset: Asset }) {
  const project = useDesk((s) => s.project);
  const select = useDesk((s) => s.select);
  const setLayer = useDesk((s) => s.setLayer);
  const setBackgroundId = useDesk((s) => s.setBackgroundId);
  const stageBeat = useDesk((s) => s.stageBeat);
  const lockBeat = useDesk((s) => s.lockBeat);
  const pushTrace = useDesk((s) => s.pushTrace);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; dx: number; dy: number } | null>(null);
  const stopRef = useRef(false);
  const fondos = project.assets.filter((item) => item.kind === "fondo");
  const fondo = fondos.find((item) => item.id === asset.scene?.backgroundId) ?? fondos[0];
  const bgUrl = useResolvedSrc(activeSrc(fondo));
  const layers = asset.scene?.layers ?? [];
  const beats = asset.scene?.beats ?? [];
  const shots = shotsOf(project);
  const activeBeatId = asset.scene?.activeBeatId;
  const currentBeat = beats.find((beat) => beat.id === activeBeatId) ?? beats[0];
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const total = beats.reduce((sum, beat) => sum + beatMs(beat), 0);

  async function run(kind: "shot" | "reel") {
    if (playing || exporting) return;
    stopRef.current = false;
    setPlaying(true);
    try {
      if (kind === "reel") await playReel(() => stopRef.current);
      else await playShot(asset.id, () => stopRef.current);
    } finally {
      setPlaying(false);
    }
  }

  async function video() {
    if (playing || exporting) return;
    setExporting(true);
    pushTrace({ role: "director", text: "Grabando el rollo…" });
    try {
      await exportReel(useDesk.getState().project);
      pushTrace({ role: "tool", tool: "video", text: "Video en Descargas.", cost: 0 });
    } catch (err) {
      pushTrace({ role: "director", text: err instanceof Error ? err.message : "No se pudo grabar." });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-well p-3">
        <div
          ref={frameRef}
          className="relative aspect-video w-full max-h-full max-w-[min(100%,calc(100dvh-14rem))] overflow-hidden rounded-sm bg-black shadow-sheet"
          onPointerMove={(event) => {
            if (playing || !drag.current || !frameRef.current) return;
            const rect = frameRef.current.getBoundingClientRect();
            const x = drag.current.x + (event.clientX - drag.current.dx) / rect.width;
            const y = drag.current.y + (event.clientY - drag.current.dy) / rect.height;
            setLayer(asset.id, drag.current.id, {
              x: Math.min(0.86, Math.max(-0.2, x)),
              y: Math.min(0.85, Math.max(-0.1, y)),
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          {bgUrl && <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {layers.map((layer) => (
            <SceneSprite
              key={layer.id}
              layer={layer}
              onDown={(event) => {
                if (playing) return;
                const frame = frameRef.current;
                if (!frame) return;
                frame.setPointerCapture(event.pointerId);
                drag.current = { id: layer.id, x: layer.x, y: layer.y, dx: event.clientX, dy: event.clientY };
              }}
            />
          ))}
          {layers.length === 0 && (
            <p className="absolute inset-0 grid place-items-center text-[13px] text-well-text/70">Sin cuerpo en el plano.</p>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded bg-black/55 px-2 py-0.5 font-mono text-[10px] tracking-wide text-well-text/90">
              {asset.name} · {(total / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      <div className="flex h-[var(--space-strip)] shrink-0 items-stretch gap-2 border-t border-line bg-sheet px-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {shots.map((shot) => (
            <button
              key={shot.id}
              type="button"
              onClick={() => select(shot.id)}
              className={`flex h-full min-w-16 shrink-0 flex-col justify-between rounded-md border px-2 py-1 text-left ${shot.id === asset.id ? "border-ink bg-fill" : "border-line bg-vellum hover:bg-fill/70"}`}
            >
              <span className="truncate font-mono text-[10px] text-muted">{shot.name.replace("Umbral", "").trim()}</span>
              <span className="text-[11px] font-medium text-ink">{(shot.scene?.beats ?? []).length} poses</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => openNextShot(asset)}
            className="flex h-full w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-muted hover:bg-fill hover:text-ink"
            aria-label="Otro plano"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l border-line pl-2">
          <Button
            tone="ink"
            disabled={beats.length < 2 && shots.length < 2}
            onClick={() => {
              if (playing) stopRef.current = true;
              else void run(shots.length >= 2 ? "reel" : "shot");
            }}
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {playing ? "Parar" : "Ver"}
          </Button>
          <Button disabled={exporting || playing} onClick={() => void video()}>
            <Film className="size-3.5" />
            {exporting ? "…" : "Video"}
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-line bg-sheet px-2 py-1">
        {beats.map((beat, index) => (
          <button
            key={beat.id}
            type="button"
            onClick={() => stageBeat(asset.id, beat.id)}
            onDoubleClick={() => lockBeat(asset.id, beat.id)}
            style={{ minWidth: `${Math.max(4.5, beatMs(beat) / 220)}rem` }}
            className={`h-8 shrink-0 truncate rounded-md px-2 text-left text-[11px] ${beat.id === activeBeatId ? "bg-ink text-sheet" : "bg-fill text-ink"}`}
          >
            {index + 1} {beat.label} · {(beatMs(beat) / 1000).toFixed(1)}s
          </button>
        ))}
        {beats.length === 0 && <p className="text-[12px] text-muted">Chat del corto: una frase de acción llena esta tira.</p>}
        {currentBeat && (
          <div className="ml-auto w-40 shrink-0">
            <Field
              label={currentBeat.label}
              value={beatMs(currentBeat) / 1000}
              min={0.3}
              max={3}
              step={0.1}
              unit="s"
              onChange={(seconds) => setBeatMs(asset.id, currentBeat.id, Math.round(seconds * 1000))}
            />
          </div>
        )}
        {fondos.length > 1 && (
          <select
            className="h-8 rounded-md border border-line bg-vellum px-2 text-[12px] text-ink"
            value={fondo?.id ?? ""}
            onChange={(event) => setBackgroundId(asset.id, event.target.value)}
          >
            {fondos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
        {layers[0] && (
          <Button onClick={() => setLayer(asset.id, layers[0].id, { flip: !layers[0].flip })}>
            <FlipHorizontal className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SceneSprite({ layer, onDown }: { layer: SceneLayer; onDown: (event: PointerEvent<HTMLImageElement>) => void }) {
  const cut = useCutout(layer.src);
  if (!cut) return null;
  return (
    <img
      src={cut}
      alt={layer.name}
      style={{
        left: `${layer.x * 100}%`,
        top: `${layer.y * 100}%`,
        height: `${layer.scale * 100}%`,
        transform: layer.flip ? "scaleX(-1)" : undefined,
      }}
      className="absolute w-auto cursor-grab touch-none"
      onPointerDown={onDown}
    />
  );
}
