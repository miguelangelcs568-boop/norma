import { useRef, useState, type PointerEvent } from "react";
import { Download, FlipHorizontal } from "lucide-react";
import { Button, Field } from "@/components/desk/controls";
import { objectFromIdb } from "@/components/desk/engine";
import { useCutout, useResolvedSrc } from "@/components/desk/media";
import { exportScene, keyPaper } from "@/lib/desk/images";
import { activeSrc, useDesk } from "@/lib/desk/store";
import type { Asset, SceneLayer } from "@/lib/desk/types";

export function SceneBoard({ asset }: { asset: Asset }) {
  const project = useDesk((s) => s.project);
  const setLayer = useDesk((s) => s.setLayer);
  const removeLayer = useDesk((s) => s.removeLayer);
  const setBackgroundId = useDesk((s) => s.setBackgroundId);
  const pushTrace = useDesk((s) => s.pushTrace);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; dx: number; dy: number } | null>(null);
  const fondos = project.assets.filter((item) => item.kind === "fondo");
  const fondo = fondos.find((item) => item.id === asset.scene?.backgroundId) ?? fondos[0];
  const bgUrl = useResolvedSrc(activeSrc(fondo));
  const layers = asset.scene?.layers ?? [];
  const [activeId, setActiveId] = useState(layers[0]?.id ?? "");
  const active = layers.find((layer) => layer.id === activeId) ?? layers[0];

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
      <div
        ref={frameRef}
        className="relative aspect-video w-full overflow-hidden rounded-2xl bg-ink"
        onPointerMove={(event) => {
          if (!drag.current || !frameRef.current) return;
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
      <p className="mt-2 text-[12px] text-muted">
        El papel de la lámina se recorta en el navegador. Mover, escalar y exportar cuestan 0. La raya es el suelo.
      </p>
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
