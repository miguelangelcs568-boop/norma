import { Clapperboard, Map, UserRound, X } from "lucide-react";
import { Director } from "@/components/desk/director";
import type { DeskKeys } from "@/lib/desk/keys";
import { useDesk } from "@/lib/desk/store";
import type { Asset, AssetKind } from "@/lib/desk/types";

export type DrawerKind = "personaje" | "fondo" | "escena";

const LABEL: Record<DrawerKind, string> = {
  personaje: "Personajes",
  fondo: "Lugares",
  escena: "Planos",
};

const ICON = {
  personaje: UserRound,
  fondo: Map,
  escena: Clapperboard,
};

export function DrawerBar({
  open,
  onOpen,
}: {
  open: DrawerKind | null;
  onOpen: (kind: DrawerKind | null) => void;
}) {
  const kinds: DrawerKind[] = ["personaje", "fondo", "escena"];
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto border-t border-line bg-sheet px-2 py-2">
      {kinds.map((kind) => {
        const Icon = ICON[kind];
        const on = open === kind;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onOpen(on ? null : kind)}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${on ? "bg-ink text-sheet" : "border border-line text-ink hover:bg-fill"}`}
          >
            <Icon className="size-3.5" />
            {LABEL[kind]}
          </button>
        );
      })}
    </div>
  );
}

export function DrawerSheet({
  kind,
  keys,
  pickedId,
  onPick,
  onClose,
}: {
  kind: DrawerKind;
  keys: DeskKeys;
  pickedId: string | null;
  onPick: (asset: Asset) => void;
  onClose: () => void;
}) {
  const project = useDesk((s) => s.project);
  const items = project.assets.filter((item) => item.kind === kind);
  const picked = items.find((item) => item.id === pickedId) ?? items[0];
  const Icon = ICON[kind];

  return (
    <div className="flex max-h-[min(42vh,22rem)] shrink-0 flex-col overflow-hidden border-t border-line bg-sheet">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.12em] text-muted uppercase">
          <Icon className="size-3.5" /> {LABEL[kind]}
        </p>
        <button type="button" className="rounded-lg p-1 text-muted hover:bg-fill hover:text-ink" onClick={onClose} aria-label="Cerrar">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[9rem_minmax(0,1fr)] overflow-hidden md:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="min-h-0 overflow-y-auto border-r border-line py-1">
          {items.length === 0 && <p className="px-3 text-[12px] text-muted">Vacío.</p>}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item)}
              className={`mx-1 flex w-[calc(100%-0.5rem)] truncate rounded-lg px-2 py-1.5 text-left text-[13px] ${item.id === picked?.id ? "bg-fill font-medium text-ink" : "text-ink/80 hover:bg-fill/60"}`}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="min-h-0 overflow-hidden">
          {picked ? <Director keys={keys} scope="asset" assetId={picked.id} /> : <p className="p-3 text-[13px] text-muted">Nada en este cajón.</p>}
        </div>
      </div>
    </div>
  );
}

export function kindOf(kind: AssetKind): DrawerKind | null {
  if (kind === "personaje" || kind === "fondo" || kind === "escena") return kind;
  return null;
}
