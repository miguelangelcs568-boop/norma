import { Clapperboard, Map, MessageSquare, UserRound, X } from "lucide-react";
import { Stage } from "@/components/desk/stage";
import type { DeskKeys } from "@/lib/desk/keys";
import { useDesk } from "@/lib/desk/store";
import type { Asset } from "@/lib/desk/types";

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

export function Dock({
  open,
  chatOpen,
  onOpen,
  onChat,
}: {
  open: DrawerKind | null;
  chatOpen: boolean;
  onOpen: (kind: DrawerKind | null) => void;
  onChat: () => void;
}) {
  const kinds: DrawerKind[] = ["personaje", "fondo", "escena"];
  return (
    <nav className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-sheet py-3">
      {kinds.map((kind) => {
        const Icon = ICON[kind];
        const on = open === kind;
        return (
          <button
            key={kind}
            type="button"
            title={LABEL[kind]}
            aria-label={LABEL[kind]}
            aria-pressed={on}
            onClick={() => onOpen(on ? null : kind)}
            className={`flex size-11 items-center justify-center rounded-2xl ${on ? "bg-ink text-sheet" : "text-muted hover:bg-fill hover:text-ink"}`}
          >
            <Icon className="size-5" strokeWidth={1.6} />
          </button>
        );
      })}
      <button
        type="button"
        title="Conversación"
        aria-label="Conversación"
        aria-pressed={chatOpen}
        onClick={onChat}
        className={`mt-auto mb-1 flex size-11 items-center justify-center rounded-2xl md:hidden ${chatOpen ? "bg-ink text-sheet" : "text-muted hover:bg-fill hover:text-ink"}`}
      >
        <MessageSquare className="size-5" strokeWidth={1.6} />
      </button>
    </nav>
  );
}

export function SidePanel({
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

  return (
    <aside className="flex h-full w-[min(22rem,100%)] shrink-0 flex-col overflow-hidden border-r border-line bg-sheet">
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <p className="text-[13px] font-semibold tracking-tight">{LABEL[kind]}</p>
        <button type="button" className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-ink" onClick={onClose} aria-label="Cerrar">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item)}
            className={`h-8 max-w-[10rem] shrink-0 truncate rounded-full px-3 text-[13px] ${item.id === picked?.id ? "bg-ink text-sheet" : "bg-fill text-ink"}`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {picked && kind !== "escena" ? <Stage asset={picked} keys={keys} /> : null}
        {picked && kind === "escena" ? (
          <div className="px-4 py-2 text-[13px] text-muted">
            <p className="font-medium text-ink">{picked.name}</p>
            <p className="mt-2 leading-relaxed">
              {(picked.scene?.beats ?? []).length} poses. El cuadro está al centro. Habla en Conversación, pestaña {picked.name.split(" ")[0]}.
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
