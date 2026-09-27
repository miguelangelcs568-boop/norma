import { useState } from "react";
import { mintPlate } from "@/components/desk/engine";
import { useResolvedSrc } from "@/components/desk/media";
import { SceneBoard } from "@/components/desk/scene";
import { ToolRow } from "@/components/desk/tools";
import { activeSrc, useDesk } from "@/lib/desk/store";
import type { Asset, Take, ViewName } from "@/lib/desk/types";

export function Stage({ asset, keys }: { asset: Asset; keys: { deepseek: string; image: string } }) {
  const url = useResolvedSrc(activeSrc(asset));
  const setActiveTake = useDesk((s) => s.setActiveTake);
  const rename = useDesk((s) => s.rename);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState<ViewName | null>(null);
  const [board, setBoard] = useState<"toma" | "hoja">("toma");
  const [guide, setGuide] = useState(false);

  async function run(view: ViewName) {
    setError(null);
    setBusy(view);
    setArmed(null);
    try {
      await mintPlate(asset, view, keys.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir la lámina");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-sheet/50 px-4 py-2">
        <input
          value={asset.name}
          onChange={(event) => rename(asset.id, event.target.value)}
          className="h-10 min-w-0 flex-1 bg-transparent font-sans text-[22px] font-semibold tracking-tight text-ink outline-none"
        />
        <span className="rounded-full bg-fill px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted uppercase">{asset.kind}</span>
      </div>
      {asset.kind === "escena" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SceneBoard asset={asset} />
        </div>
      ) : (
        <>
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-line px-4 py-2">
            {asset.takes.map((take) => (
              <button
                key={take.id}
                type="button"
                onClick={() => setActiveTake(asset.id, take.id)}
                className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-medium ${take.id === asset.activeTakeId ? "bg-ink text-sheet" : "border border-line bg-sheet text-ink"}`}
              >
                {take.label}
                {take.locked ? " · fija" : ""}
              </button>
            ))}
            {asset.takes.length === 0 && <p className="text-[13px] text-muted">Todavía no hay lámina. Sube un boceto o pide una.</p>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid place-items-center bg-vellum p-6">
              {board === "hoja" && asset.kind === "personaje" ? (
                <ModelSheet asset={asset} />
              ) : url ? (
                <div className="relative inline-block">
                  <img src={url} alt={asset.name} className="max-h-80 w-auto object-contain" />
                  {guide && asset.kind === "personaje" && <HeadGuide />}
                </div>
              ) : (
                <p className="text-[13px] text-muted">Mesa vacía. Sube un boceto o pide una vista.</p>
              )}
            </div>
            {asset.kind === "personaje" && <Ficha asset={asset} />}
          </div>
          <ToolRow
            asset={asset}
            busy={busy}
            armed={armed}
            board={board}
            guide={guide}
            onBoard={setBoard}
            onGuide={setGuide}
            onArm={setArmed}
            onRun={(view) => void run(view)}
          />
        </>
      )}
      {error && <p className="px-4 py-2 text-[12px] text-accent">{error}</p>}
    </div>
  );
}

function HeadGuide() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="absolute right-0 left-0 border-t border-accent" style={{ top: `${(i / 8) * 100}%` }} />
      ))}
    </div>
  );
}

function ModelSheet({ asset }: { asset: Asset }) {
  return (
    <div className="flex w-full items-end gap-3 overflow-x-auto">
      {asset.takes.map((take) => (
        <SheetTake key={take.id} take={take} />
      ))}
      {asset.takes.length === 0 && <p className="text-[13px] text-muted">La hoja se llena con las vistas que fijes.</p>}
    </div>
  );
}

function SheetTake({ take }: { take: Take }) {
  const url = useResolvedSrc(take.src);
  return (
    <figure className="w-36 shrink-0">
      {url ? <img src={url} alt={take.label} className="h-72 w-full object-contain object-bottom" /> : null}
      <figcaption className="mt-1 text-center text-[12px] text-muted">{take.label}</figcaption>
    </figure>
  );
}

function Ficha({ asset }: { asset: Asset }) {
  const patchSpec = useDesk((s) => s.patchSpec);
  const spec = asset.spec;
  return (
    <div className="grid gap-3 border-t border-line bg-sheet/40 p-4 md:grid-cols-2">
      <label className="text-[12px] text-muted">
        Oficio
        <textarea
          value={spec.role}
          onChange={(event) => patchSpec(asset.id, { role: event.target.value.slice(0, 240) })}
          className="mt-1.5 h-20 w-full rounded-xl border border-line bg-sheet p-2.5 text-[13px] text-ink outline-none focus:border-accent"
        />
      </label>
      <label className="text-[12px] text-muted">
        Vestuario que no se negocia
        <textarea
          value={spec.costume}
          onChange={(event) => patchSpec(asset.id, { costume: event.target.value.slice(0, 320) })}
          className="mt-1.5 h-20 w-full rounded-xl border border-line bg-sheet p-2.5 text-[13px] text-ink outline-none focus:border-accent"
        />
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        {spec.palette.map((hex) => (
          <span key={hex} className="flex items-center gap-2 font-mono text-[11px]">
            <span className="size-7 rounded-full border border-line" style={{ backgroundColor: hex }} />
            {hex}
          </span>
        ))}
        {spec.palette.length === 0 && <span className="text-[12px] text-muted">Sin paleta. Extráela de la lámina.</span>}
      </div>
    </div>
  );
}
