import { Clapperboard, Image as ImageIcon, Map, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { emptySpec, nid, useDesk } from "@/lib/desk/store";
import type { AssetKind } from "@/lib/desk/types";

const KIND_ICON = { personaje: UserRound, fondo: Map, escena: Clapperboard, prop: ImageIcon };

export function Tree() {
  const project = useDesk((s) => s.project);
  const select = useDesk((s) => s.select);
  const addAsset = useDesk((s) => s.addAsset);
  const resetDemo = useDesk((s) => s.resetDemo);
  const groups: { kind: AssetKind; label: string }[] = [
    { kind: "personaje", label: "Personajes" },
    { kind: "fondo", label: "Fondos" },
    { kind: "escena", label: "Escenas" },
    { kind: "prop", label: "Props" },
  ];
  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-sheet/40 md:border-r">
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {groups.map((group) => {
          const Icon = KIND_ICON[group.kind];
          const items = project.assets.filter((asset) => asset.kind === group.kind);
          return (
            <div key={group.kind} className="mb-3">
              <div className="flex items-center justify-between px-4 py-1">
                <p className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">{group.label}</p>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-ink"
                  aria-label={`Nuevo ${group.label}`}
                  onClick={() =>
                    addAsset({
                      id: nid(),
                      kind: group.kind,
                      name: group.label.slice(0, -1),
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
                  className={`mx-2 flex h-9 w-[calc(100%-1rem)] items-center gap-2 rounded-xl px-2.5 text-left text-[13px] ${asset.id === project.selectedId ? "bg-fill font-medium text-ink" : "text-ink/80 hover:bg-fill/60"}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{asset.name}</span>
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
