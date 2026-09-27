import { Clapperboard, Image as ImageIcon, Map, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { emptySpec, nid, useDesk } from "@/lib/desk/store";
import type { AssetKind } from "@/lib/desk/types";

const KIND_ICON = { personaje: UserRound, fondo: Map, escena: Clapperboard, prop: ImageIcon };
const KIND_NEW: Record<AssetKind, string> = {
  personaje: "Personaje nuevo",
  fondo: "Fondo nuevo",
  escena: "Plano nuevo",
  prop: "Prop nuevo",
};

export function Tree() {
  const project = useDesk((s) => s.project);
  const select = useDesk((s) => s.select);
  const addAsset = useDesk((s) => s.addAsset);
  const resetDemo = useDesk((s) => s.resetDemo);
  const groups: { kind: AssetKind; label: string }[] = [
    { kind: "personaje", label: "Personajes" },
    { kind: "fondo", label: "Lugares" },
    { kind: "escena", label: "Planos" },
    { kind: "prop", label: "Props" },
  ];
  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-sheet md:border-r">
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {groups.map((group) => {
          const Icon = KIND_ICON[group.kind];
          const items = project.assets.filter((asset) => asset.kind === group.kind);
          return (
            <div key={group.kind} className="mb-4">
              <div className="flex items-center justify-between px-4 py-1">
                <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">{group.label}</p>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-fill hover:text-ink"
                  aria-label={`Nuevo ${group.label}`}
                  onClick={() =>
                    addAsset({
                      id: nid(),
                      kind: group.kind,
                      name: KIND_NEW[group.kind],
                      spec: emptySpec(),
                      takes: [],
                      activeTakeId: null,
                      scene: group.kind === "escena" ? { layers: [] } : undefined,
                    })
                  }
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {items.length === 0 && <p className="px-4 text-[12px] text-muted">Vacío.</p>}
              {items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => select(asset.id)}
                  className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] ${asset.id === project.selectedId ? "bg-fill font-medium text-ink" : "text-ink/80 hover:bg-fill/60"}`}
                >
                  <Icon className="size-3.5 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{asset.name}</span>
                  <span className="text-[10px] tabular-nums text-muted">{asset.takes.length || ""}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="border-t border-line p-3">
        <Button className="w-full" onClick={resetDemo}>
          Volver al corto
        </Button>
      </div>
    </aside>
  );
}
