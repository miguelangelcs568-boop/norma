import { useState } from "react";
import { ChevronRight, Clapperboard, Folder, Map, UserRound, BookMarked } from "lucide-react";
import { nodeDirty } from "@/lib/norma/compile";
import { useStudio } from "@/lib/norma/store";
import type { NodeKind, StudioNode } from "@/lib/norma/types";
import { Button } from "./controls";

const ICON: Record<NodeKind, typeof Folder> = {
  biblia: BookMarked,
  carpeta: Folder,
  personaje: UserRound,
  locacion: Map,
  secuencia: Clapperboard,
  plano: Clapperboard,
};

export function Binder() {
  const project = useStudio((s) => s.project);
  const select = useStudio((s) => s.select);
  const addNode = useStudio((s) => s.addNode);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-vellum md:border-r">
      <div className="flex items-center justify-between px-3 py-3">
        <p className="font-mono text-xs tracking-widest text-muted uppercase">Archivo</p>
        <span className="font-mono text-xs text-muted tabular-nums">{project.nodes.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <Tree
          nodes={project.nodes}
          parentId={null}
          depth={0}
          selectedId={project.selectedId}
          collapsed={collapsed}
          project={project}
          onToggle={(id) => setCollapsed((current) => ({ ...current, [id]: !current[id] }))}
          onSelect={select}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
        <Button onClick={() => addNode("carpeta")}>Carpeta</Button>
        <Button onClick={() => addNode("personaje")}>Persona</Button>
        <Button onClick={() => addNode("locacion")}>Lugar</Button>
        <Button onClick={() => addNode("secuencia")}>Secuencia</Button>
        <Button className="col-span-2" tone="ink" onClick={() => addNode("plano")}>
          Plano
        </Button>
      </div>
    </aside>
  );
}

function Tree({
  nodes,
  parentId,
  depth,
  selectedId,
  collapsed,
  project,
  onToggle,
  onSelect,
}: {
  nodes: StudioNode[];
  parentId: string | null;
  depth: number;
  selectedId: string;
  collapsed: Record<string, boolean>;
  project: ReturnType<typeof useStudio.getState>["project"];
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const kids = nodes.filter((node) => node.parentId === parentId);
  return (
    <ul>
      {kids.map((node) => {
        const children = nodes.some((item) => item.parentId === node.id);
        const open = !collapsed[node.id];
        const Icon = ICON[node.kind];
        const selected = node.id === selectedId;
        const pad = depth === 0 ? "pl-1" : depth === 1 ? "pl-4" : depth === 2 ? "pl-8" : "pl-10";
        return (
          <li key={node.id}>
            <div className={`flex items-center ${pad}`}>
              {children ? (
                <button
                  type="button"
                  className="flex size-11 items-center justify-center"
                  aria-label={open ? `Cerrar ${node.name}` : `Abrir ${node.name}`}
                  onClick={() => onToggle(node.id)}
                >
                  <ChevronRight className={`size-4 ${open ? "rotate-90" : ""}`} />
                </button>
              ) : (
                <span className="size-11 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => onSelect(node.id)}
                className={`flex h-11 min-w-0 flex-1 items-center gap-2 pr-3 text-left font-mono text-xs ${selected ? "bg-ink text-sheet" : "text-ink"}`}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{node.name}</span>
                {nodeDirty(project, node) && <span className="ml-auto size-2 shrink-0 bg-accent" aria-label="sucio" />}
              </button>
            </div>
            {children && open && (
              <Tree
                nodes={nodes}
                parentId={node.id}
                depth={depth + 1}
                selectedId={selectedId}
                collapsed={collapsed}
                project={project}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
