import { useRef, useState, type PointerEvent } from "react";
import { Download, FlipHorizontal, Pause, Play } from "lucide-react";
import { Button, Field } from "@/components/desk/controls";
import { objectFromIdb } from "@/components/desk/engine";
import { useCutout, useResolvedSrc } from "@/components/desk/media";
import { exportScene, keyPaper } from "@/lib/desk/images";
import { beatMs } from "@/lib/desk/partitura";
import { activeSrc, useDesk } from "@/lib/desk/store";
import { VIEW_LABEL, type Asset, type Beat, type SceneLayer } from "@/lib/desk/types";

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function tween(ms: number, tick: (t: number) => void) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / Math.max(200, ms));
      tick(ease(t));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const setLayer = useDesk((s) => s.setLayer);
  const removeLayer = useDesk((s) => s.removeLayer);
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
  const activeBeatId = asset.scene?.activeBeatId;
  const currentBeat = beats.find((beat) => beat.id === activeBeatId) ?? beats[0];
  const [activeId, setActiveId] = useState(layers[0]?.id ?? "");
  const [playing, setPlaying] = useState(false);
  const active = layers.find((layer) => layer.id === activeId) ?? layers[0];
  const total = beats.reduce((sum, beat) => sum + beatMs(beat), 0);

  async function play() {
    if (beats.length < 2 || playing) return;
    stopRef.current = false;
    setPlaying(true);
    pushTrace({
      role: "tool",
      tool: "ver",
      text: `Recorre ${beats.length} poses en ${(total / 1000).toFixed(1)} s. 0 láminas.`,
      cost: 0,
    });
    try {
      for (let i = 0; i < beats.length; i++) {
        if (stopRef.current) break;
        const from = beats[i];
        const to = beats[i + 1];
        stageBeat(asset.id, from.id);
        await wait(beatMs(from));
        if (!to || stopRef.current) continue;
        const layerId =
          useDesk.getState().project.assets.find((item) => item.id === asset.id)?.scene?.layers[0]?.id ?? active?.id;
        if (!layerId) continue;
        await tween(Math.min(900, beatMs(from)), (t) => {
          if (stopRef.current) return;
          setLayer(asset.id, layerId, {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
            scale: from.scale + (to.scale - from.scale) * t,
            flip: t < 0.5 ? from.flip : to.flip,
          });
        });
        stageBeat(asset.id, to.id);
      }
    } finally {
      setPlaying(false);
    }
  }

  async function save() {
    if (!bgUrl || layers.length === 0) return;
    const painted = [];
    for (const layer of layers) {
      const raw = await objectFromIdb(layer.src);
      const cut = await keyPaper(raw);
      painted.push({ src: cut, x: layer.x, y: layer.y, scale: layer.scale, flip: layer.flip });
    }
    const blob = await exportScene({ background: bgUrl, layers: painted });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${asset.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
    pushTrace({ role: "tool", tool: "exportar", text: "PNG compuesto aquí. El recorte y el encuadre no pidieron lámina.", cost: 0 });
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex gap-2 overflow-x-auto">
        {fondos.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setBackgroundId(asset.id, item.id)}
            className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-medium ${item.id === fondo?.id ? "bg-ink text-sheet" : "border border-line bg-sheet text-ink"}`}
          >
            {item.name}
          </button>
        ))}
        {fondos.length === 0 && <p className="text-[13px] text-muted">No hay fondo. Crea uno y sube la escena que quieras.</p>}
      </div>
      <div className="mb-2 flex items-center gap-2 overflow-x-auto">
        {beats.map((beat, index) => (
          <BeatChip
            key={beat.id}
            beat={beat}
            index={index}
            on={beat.id === activeBeatId}
            onStage={() => stageBeat(asset.id, beat.id)}
            onLock={() => {
              lockBeat(asset.id, beat.id);
              pushTrace({ role: "tool", tool: "fijar", text: `${beat.label} fijada. 0 láminas.`, cost: 0 });
            }}
          />
        ))}
        {beats.length >= 2 && (
          <Button
            tone="ink"
            onClick={() => {
              if (playing) stopRef.current = true;
              else void play();
            }}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? "Parar" : "Ver"}
          </Button>
        )}
        {beats.length === 0 && (
          <p className="text-[12px] text-muted">En el chat del plano: Lina entra al muelle, para, mira el agua.</p>
        )}
      </div>
      {currentBeat && (
        <div className="mb-2 max-w-sm">
          <Field
            label={`Tiempo · ${currentBeat.label}`}
            value={beatMs(currentBeat) / 1000}
            min={0.3}
            max={3}
            step={0.1}
            unit="s"
            onChange={(seconds) => setBeatMs(asset.id, currentBeat.id, Math.round(seconds * 1000))}
          />
          <p className="text-[11px] text-muted">El plano dura {(total / 1000).toFixed(1)} s en total.</p>
        </div>
      )}
      <div
        ref={frameRef}
        className="relative aspect-video w-full overflow-hidden rounded-2xl bg-ink"
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
        <div className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-sheet opacity-70" style={{ top: "92%" }} />
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
              setActiveId(layer.id);
            }}
          />
        ))}
        {layers.length === 0 && (
          <p className="absolute inset-0 grid place-items-center text-[13px] text-sheet">Pon un personaje desde su mesa.</p>
        )}
      </div>
      {active && (
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
          <Field
            label={active.name}
            value={active.scale}
            min={0.25}
            max={0.9}
            step={0.01}
            onChange={(scale) => setLayer(asset.id, active.id, { scale })}
          />
          <Button onClick={() => setLayer(asset.id, active.id, { flip: !active.flip })}>
            <FlipHorizontal className="size-4" /> Voltear
          </Button>
          <Button
            onClick={() => {
              removeLayer(asset.id, active.id);
              pushTrace({ role: "tool", tool: "componer_escena", text: `${active.name} sale del plano. 0 láminas.`, cost: 0 });
            }}
          >
            Quitar
          </Button>
          <Button tone="ink" onClick={() => void save()} disabled={!bgUrl}>
            <Download className="size-4" /> Exportar PNG
          </Button>
        </div>
      )}
      <p className="mt-2 text-[12px] text-muted">Clic en una pose, mueve el tiempo, Ver otra vez. 0 láminas.</p>
    </div>
  );
}

function BeatChip({
  beat,
  index,
  on,
  onStage,
  onLock,
}: {
  beat: Beat;
  index: number;
  on: boolean;
  onStage: () => void;
  onLock: () => void;
}) {
  return (
    <div className={`flex shrink-0 items-center gap-1 rounded-2xl border px-2 py-1 ${on ? "border-ink bg-fill" : "border-line bg-sheet"}`}>
      <button type="button" onClick={onStage} className="text-left">
        <span className="block text-[11px] font-medium text-ink">
          {index + 1}. {beat.label}
        </span>
        <span className="block text-[10px] text-muted">
          {VIEW_LABEL[beat.view]} · {(beatMs(beat) / 1000).toFixed(1)}s
        </span>
      </button>
      {beat.status !== "fijado" && (
        <button type="button" onClick={onLock} className="rounded-full px-2 text-[10px] text-muted hover:text-ink">
          Fijar
        </button>
      )}
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
