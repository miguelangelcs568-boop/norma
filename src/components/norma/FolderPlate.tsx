import type { FolderNode, Project, SequenceNode } from "@/lib/norma/types";
import { useStudio } from "@/lib/norma/store";
import { SheetFrame } from "./SheetFrame";

export function FolderPlate({ project, node }: { project: Project; node: FolderNode | SequenceNode }) {
  const select = useStudio((s) => s.select);
  const children = project.nodes.filter((item) => item.parentId === node.id);
  const text = node.kind === "carpeta" ? node.brief : node.intent;
  return (
    <SheetFrame
      kicker={node.kind === "carpeta" ? "Carpeta" : "Secuencia"}
      title={node.name}
      meta={`${children.length} dentro`}
    >
      <p className="font-sans text-lg text-pretty">{text || "Sin nota. El corte de la derecha la escribe."}</p>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {children.length === 0 && (
          <li className="py-3 font-mono text-xs text-muted">Vacía. Lo que no tiene carpeta no existe en el plano.</li>
        )}
        {children.map((child) => (
          <li key={child.id}>
            <button type="button" className="flex h-11 w-full items-center justify-between text-left font-mono text-xs" onClick={() => select(child.id)}>
              <span>{child.name}</span>
              <span className="text-muted">{child.kind}</span>
            </button>
          </li>
        ))}
      </ul>
    </SheetFrame>
  );
}
