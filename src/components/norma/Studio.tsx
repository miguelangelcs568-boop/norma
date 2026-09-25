import { useEffect } from "react";
import { costReport, findNode } from "@/lib/norma/compile";
import { useStudio, type Pane } from "@/lib/norma/store";
import { BiblePlate } from "./BiblePlate";
import { Binder } from "./Binder";
import { CharacterPlate } from "./CharacterPlate";
import { FolderPlate } from "./FolderPlate";
import { Inspector } from "./Inspector";
import { LocationPlate } from "./LocationPlate";
import { ShotPlate } from "./ShotPlate";

export function Studio() {
  const project = useStudio((s) => s.project);
  const pane = useStudio((s) => s.mobilePane);
  const setPane = useStudio((s) => s.setMobilePane);
  const cost = costReport(project);
  const node = findNode(project, project.selectedId);

  useEffect(() => {
    void useStudio.persist.rehydrate();
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-vellum text-ink">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-2 border-b border-line px-3 py-3 md:px-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-accent uppercase">NORMA</p>
          <h1 className="font-sans text-2xl leading-none md:text-3xl">{project.bible.title}</h1>
        </div>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
          <div>
            <dt className="text-muted">Semilla</dt>
            <dd className="tabular-nums">{project.bible.seed}</dd>
          </div>
          <div>
            <dt className="text-muted">Archivo</dt>
            <dd className="tabular-nums">{cost.storedLabel}</dd>
          </div>
          <div>
            <dt className="text-muted">Contra video</dt>
            <dd className="tabular-nums">{cost.ratio}</dd>
          </div>
          <div>
            <dt className="text-muted">Sucios</dt>
            <dd className={`tabular-nums ${cost.dirty > 0 ? "text-accent" : ""}`}>{cost.dirty}</dd>
          </div>
        </dl>
      </header>
      <div className="flex gap-1 border-b border-line p-2 md:hidden">
        <PaneButton current={pane} pane="archivo" label="Archivo" onSelect={setPane} />
        <PaneButton current={pane} pane="hoja" label="Hoja" onSelect={setPane} />
        <PaneButton current={pane} pane="corte" label="Corte" onSelect={setPane} />
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[17rem_minmax(0,1fr)_20rem]">
        <div className={pane === "archivo" ? "min-h-0" : "hidden md:block md:min-h-0"}>
          <Binder />
        </div>
        <main className={`${pane === "hoja" ? "block" : "hidden md:block"} min-h-0 overflow-y-auto px-3 py-4 md:px-6`}>
          <Sheet nodeId={node?.id ?? ""} />
        </main>
        <div className={pane === "corte" ? "min-h-0" : "hidden md:block md:min-h-0"}>
          <Inspector />
        </div>
      </div>
    </div>
  );
}

function PaneButton({
  current,
  pane,
  label,
  onSelect,
}: {
  current: Pane;
  pane: Pane;
  label: string;
  onSelect: (pane: Pane) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pane)}
      className={`h-11 flex-1 font-mono text-xs tracking-wide uppercase ${current === pane ? "bg-ink text-sheet" : "border border-line bg-sheet text-ink"}`}
    >
      {label}
    </button>
  );
}

function Sheet({ nodeId }: { nodeId: string }) {
  const project = useStudio((s) => s.project);
  const node = findNode(project, nodeId);
  if (!node) return null;
  if (node.kind === "biblia") return <BiblePlate project={project} />;
  if (node.kind === "personaje") return <CharacterPlate project={project} node={node} />;
  if (node.kind === "locacion") return <LocationPlate project={project} node={node} />;
  if (node.kind === "plano") return <ShotPlate project={project} node={node} />;
  return <FolderPlate project={project} node={node} />;
}
