import { useRef, useState } from "react";
import { Clapperboard, FolderOpen, HardDrive, Image as ImageIcon, Map, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { downloadPack, packProject, readPackFile } from "@/lib/desk/pack";
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
  const loadProject = useDesk((s) => s.loadProject);
  const pushTrace = useDesk((s) => s.pushTrace);
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const groups: { kind: AssetKind; label: string }[] = [
    { kind: "personaje", label: "Personajes" },
    { kind: "fondo", label: "Lugares" },
    { kind: "escena", label: "Planos" },
    { kind: "prop", label: "Props" },
  ];

  async function saveLocal() {
    try {
      const pack = await packProject(project);
      downloadPack(pack);
      pushTrace({ role: "tool", tool: "guardar", text: "Corto bajado a Descargas.", cost: 0 });
      setNote("En Descargas, archivo .norma.json");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  async function openLocal(file: File) {
    try {
      const next = await readPackFile(file);
      loadProject(next);
      pushTrace({ role: "tool", tool: "abrir", text: `Abierto ${next.title} desde el PC.`, cost: 0 });
      setNote("Abierto desde el archivo");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "No se pudo abrir");
    }
  }

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
                      thread: [
                        {
                          id: nid(),
                          role: "director",
                          text: `Chat nuevo de ${KIND_NEW[group.kind]}. El corto sigue siendo ${project.title}.`,
                        },
                      ],
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
      <div className="space-y-2 border-t border-line p-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,.norma.json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void openLocal(file);
          }}
        />
        <Button className="w-full" onClick={() => void saveLocal()}>
          <HardDrive className="size-4" /> Guardar en el PC
        </Button>
        <Button className="w-full" onClick={() => fileRef.current?.click()}>
          <FolderOpen className="size-4" /> Abrir del PC
        </Button>
        <Button className="w-full" onClick={resetDemo}>
          Volver al corto
        </Button>
        {note && <p className="text-[11px] leading-snug text-muted">{note}</p>}
      </div>
    </aside>
  );
}
