import { Plus, Trash2, X } from "lucide-react";
import type { Shelf, ShelfItem } from "@/lib/desk/library";
import { whenOf } from "@/lib/desk/library";

export function ProjectsPanel({
  shelf,
  onOpen,
  onNew,
  onDemo,
  onDrop,
  onClose,
}: {
  shelf: Shelf;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDemo: () => void;
  onDrop: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button type="button" className="absolute inset-0 bg-ink/25 backdrop-blur-sm" aria-label="Cerrar proyectos" onClick={onClose} />
      <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-sheet shadow-[var(--shadow-sheet)]">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">NORMA</p>
            <h2 className="text-[18px] font-semibold tracking-tight">Proyectos</h2>
          </div>
          <button type="button" className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-ink" onClick={onClose} aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          <button type="button" onClick={onNew} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-3 py-3 text-left hover:bg-fill">
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-sheet">
              <Plus className="size-4" />
            </span>
            <span>
              <span className="block text-[14px] font-medium text-ink">Nuevo proyecto</span>
              <span className="block text-[12px] text-muted">Mesa vacía. El corto de ahora se queda en la lista.</span>
            </span>
          </button>
          {shelf.items.map((item) => (
            <ProjectRow key={item.id} item={item} current={item.id === shelf.currentId} canDrop={shelf.items.length > 1} onOpen={onOpen} onDrop={onDrop} />
          ))}
          {!shelf.items.some((item) => item.demo || item.id === "palma") && (
            <button type="button" onClick={onDemo} className="w-full rounded-2xl px-3 py-2 text-left text-[13px] text-muted hover:bg-fill hover:text-ink">
              Traer el corto de muestra · La sal de Punta Palma
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectRow({
  item,
  current,
  canDrop,
  onOpen,
  onDrop,
}: {
  item: ShelfItem;
  current: boolean;
  canDrop: boolean;
  onOpen: (id: string) => void;
  onDrop: (id: string) => void;
}) {
  const n = item.project.assets.length;
  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-2 py-2 ${current ? "border-ink bg-fill" : "border-line"}`}>
      <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 rounded-xl px-2 py-1 text-left">
        <span className="block truncate text-[14px] font-medium text-ink">{item.title}</span>
        <span className="block text-[12px] text-muted">
          {item.demo ? "Muestra · " : ""}
          {n === 0 ? "Vacío" : `${n} ${n === 1 ? "activo" : "activos"}`}
          {item.updatedAt ? ` · ${whenOf(item.updatedAt)}` : ""}
        </span>
      </button>
      {canDrop && (
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sheet hover:text-ink"
          aria-label={`Quitar ${item.title}`}
          onClick={() => {
            if (window.confirm(`¿Quitar «${item.title}» de la lista? El archivo guardado en el PC no se toca.`)) onDrop(item.id);
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}
