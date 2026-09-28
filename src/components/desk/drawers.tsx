import { Clapperboard, Map, MessageSquare, UserRound, X } from "lucide-react";
import { Director } from "@/components/desk/director";
import { Stage } from "@/components/desk/stage";
import type { DeskKeys } from "@/lib/desk/keys";
import { useDesk } from "@/lib/desk/store";
import type { Asset } from "@/lib/desk/types";

export type DrawerKind = "personaje" | "fondo" | "escena" | "chat";

const LABEL: Record<DrawerKind, string> = {
  personaje: "Personajes",
  fondo: "Lugares",
  escena: "Planos",
  chat: "Chat",
};

const ICON = {
  personaje: UserRound,
  fondo: Map,
  escena: Clapperboard,
  chat: MessageSquare,
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
    <nav className="flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r border-line bg-sheet py-2">
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
            className={`flex size-10 items-center justify-center rounded-xl ${on ? "bg-ink text-sheet" : "text-muted hover:bg-fill hover:text-ink"}`}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-1 md:hidden">
        <button
          type="button"
          title="Chat del corto"
          aria-label="Chat del corto"
          aria-pressed={chatOpen}
          onClick={onChat}
          className={`flex size-10 items-center justify-center rounded-xl ${chatOpen ? "bg-ink text-sheet" : "text-muted hover:bg-fill hover:text-ink"}`}
        >
          <MessageSquare className="size-4" />
        </button>
      </div>
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
  if (kind === "chat") {
    return (
      <div className="flex h-full w-full min-w-0 flex-col border-r border-line bg-sheet md:w-[var(--space-panel)]">
        <Director keys={keys} scope="general" />
      </div>
    );
  }
  const project = useDesk((s) => s.project);
  const items = project.assets.filter((item) => item.kind === kind);
  const picked = items.find((item) => item.id === pickedId) ?? items[0];

  return (
    <aside className="flex h-full w-[min(22rem,100%)] shrink-0 flex-col overflow-hidden border-r border-line bg-sheet md:w-[var(--space-panel)]">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">{LABEL[kind]}</p>
        <button type="button" className="rounded-md p-1 text-muted hover:bg-fill hover:text-ink" onClick={onClose} aria-label="Cerrar cajón">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 py-1.5">
        {items.length === 0 && <p className="px-1 text-[12px] text-muted">Vacío.</p>}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item)}
            className={`h-7 max-w-[9rem] shrink-0 truncate rounded-full px-2.5 text-[12px] ${item.id === picked?.id ? "bg-ink text-sheet" : "text-ink hover:bg-fill"}`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {picked && kind !== "escena" ? <Stage asset={picked} keys={keys} /> : null}
        {picked && kind === "escena" ? <Director keys={keys} scope="asset" assetId={picked.id} /> : null}
        {!picked && <p className="p-3 text-[13px] text-muted">Nada en este cajón.</p>}
      </div>
    </aside>
  );
}
