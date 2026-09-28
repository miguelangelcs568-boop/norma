import { useState } from "react";
import { mintPlate } from "@/components/desk/engine";
import { useResolvedSrc } from "@/components/desk/media";
import { SceneBoard } from "@/components/desk/scene";
import { ToolRow } from "@/components/desk/tools";
import { fillActing } from "@/lib/desk/body";
import type { DeskKeys } from "@/lib/desk/keys";
import { activeSrc, useDesk } from "@/lib/desk/store";
import { ACTING_VIEWS, VIEW_LABEL, missingViews, viewsFor, type Asset, type Take, type ViewName } from "@/lib/desk/types";

export function Stage({ asset, keys }: { asset: Asset; keys: DeskKeys }) {
  const url = useResolvedSrc(activeSrc(asset));
  const setActiveTake = useDesk((s) => s.setActiveTake);
  const rename = useDesk((s) => s.rename);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState<ViewName | null>(null);
  const [board, setBoard] = useState<"toma" | "hoja">("toma");
  const [guide, setGuide] = useState(false);
  const slots = viewsFor(asset.kind);
  const miss = missingViews(asset);
  const needBody = asset.kind === "personaje" && ACTING_VIEWS.some((view) => !asset.takes.some((take) => take.view === view));

  async function run(view: ViewName) {
    setError(null);
    setBusy(view);
    setArmed(null);
    try {
      await mintPlate(asset, view, keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir la lámina");
    } finally {
      setBusy(null);
    }
  }

  if (asset.kind === "escena") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <SceneBoard asset={asset} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center gap-2 px-3">
        <input
          value={asset.name}
          onChange={(event) => rename(asset.id, event.target.value)}
          className="h-8 min-w-0 flex-1 bg-transparent text-[14px] font-medium tracking-tight text-ink outline-none"
        />
        {needBody && (
          <button type="button" className="h-7 rounded-full bg-ink px-3 text-[12px] font-medium text-sheet" onClick={() => fillActing(asset)}>
            Cuerpo
          </button>
        )}
      </div>
      {slots.length > 0 && (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-2 py-2">
          {slots.map((view) => {
            const take = asset.takes.find((item) => item.view === view);
            const on = take && take.id === asset.activeTakeId;
            const body = ACTING_VIEWS.includes(view);
            return (
              <button
                key={view}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  if (take) setActiveTake(asset.id, take.id);
                  else void run(view);
                }}
                className={`h-16 w-[4.4rem] shrink-0 overflow-hidden rounded-xl text-left ${on ? "bg-ink text-sheet" : body ? "bg-fill" : "bg-vellum"} ${take ? "" : "outline-dashed outline-1 outline-line"}`}
              >
                {take ? (
                  <SlotThumb take={take} />
                ) : (
                  <span className="flex h-full flex-col justify-between p-1.5 text-[10px] leading-tight text-muted">
                    <span>{VIEW_LABEL[view]}</span>
                    <span>{busy === view ? "…" : "Pedir"}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid place-items-center p-4">
          {board === "hoja" && asset.kind === "personaje" ? (
            <ModelSheet asset={asset} />
          ) : url ? (
            <img src={url} alt={asset.name} className="max-h-48 w-auto object-contain" />
          ) : (
            <p className="max-w-xs text-center text-[12px] text-muted">
              {miss.length > 0 ? `Sube un boceto o pide ${VIEW_LABEL[miss[0]]}.` : "Sube un boceto."}
            </p>
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
      {error && <p className="shrink-0 px-3 py-1 text-[12px] text-muted">{error}</p>}
    </div>
  );
}

function SlotThumb({ take }: { take: Take }) {
  const url = useResolvedSrc(take.src);
  return (
    <span className="relative block h-full w-full">
      {url ? <img src={url} alt={take.label} className="h-full w-full object-cover" /> : null}
      <span className="absolute inset-x-0 bottom-0 bg-sheet/80 px-1 text-[9px] text-ink">{take.label}</span>
    </span>
  );
}

function ModelSheet({ asset }: { asset: Asset }) {
  return (
    <div className="flex w-full items-end gap-2 overflow-x-auto">
      {asset.takes.map((take) => (
        <SheetTake key={take.id} take={take} />
      ))}
    </div>
  );
}

function SheetTake({ take }: { take: Take }) {
  const url = useResolvedSrc(take.src);
  return (
    <figure className="w-24 shrink-0">
      {url ? <img src={url} alt={take.label} className="h-36 w-full object-contain object-bottom" /> : null}
      <figcaption className="mt-1 text-center text-[10px] text-muted">{take.label}</figcaption>
    </figure>
  );
}

function Ficha({ asset }: { asset: Asset }) {
  const patchSpec = useDesk((s) => s.patchSpec);
  const spec = asset.spec;
  return (
    <div className="grid gap-2 border-t border-line p-3">
      <label className="text-[11px] text-muted">
        Oficio
        <textarea value={spec.role} onChange={(event) => patchSpec(asset.id, { role: event.target.value.slice(0, 240) })} className="mt-1 h-16 w-full rounded-lg bg-fill p-2 text-[12px] text-ink outline-none" />
      </label>
      <label className="text-[11px] text-muted">
        Vestuario
        <textarea value={spec.costume} onChange={(event) => patchSpec(asset.id, { costume: event.target.value.slice(0, 320) })} className="mt-1 h-16 w-full rounded-lg bg-fill p-2 text-[12px] text-ink outline-none" />
      </label>
    </div>
  );
}
