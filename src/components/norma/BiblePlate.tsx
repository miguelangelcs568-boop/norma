import { costReport, isLockable, stepStatus, stepsFor } from "@/lib/norma/compile";
import { STEP_LABEL, type Project } from "@/lib/norma/types";
import { useStudio } from "@/lib/norma/store";
import { Button } from "./controls";
import { SheetFrame } from "./SheetFrame";

export function BiblePlate({ project }: { project: Project }) {
  const loadBlank = useStudio((s) => s.loadBlank);
  const loadDemo = useStudio((s) => s.loadDemo);
  const cost = costReport(project);
  const bible = project.bible;

  return (
    <SheetFrame kicker="Biblia de producción" title={bible.title} meta={`semilla ${bible.seed}`}>
      <p className="font-sans text-lg text-pretty text-ink">{bible.logline}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-4">
        <Stat label="Archivo" value={cost.storedLabel} />
        <Stat label="Si fuera video" value={cost.videoLabel} />
        <Stat label="Relación" value={cost.ratio} />
        <Stat label="Pasos sucios" value={String(cost.dirty)} />
      </dl>
      <p className="mt-3 font-mono text-xs text-pretty text-muted">
        peso = semilla + proporciones + firmas + rechazos. No peso = planos × {24 * 4} cuadros × 1920 × 1080. El
        mundo se evalúa al mirarlo. Por eso el zoom no engorda el archivo.
      </p>
      <h3 className="mt-5 font-mono text-xs tracking-widest text-muted uppercase">Nunca</h3>
      <ul className="mt-2 space-y-1">
        {bible.never.map((rule) => (
          <li key={rule} className="font-mono text-xs text-ink">
            {rule}
          </li>
        ))}
      </ul>
      <h3 className="mt-5 font-mono text-xs tracking-widest text-muted uppercase">Pigmentos</h3>
      <ul className="mt-2 flex flex-wrap gap-3">
        {bible.pigments.map((pigment) => (
          <li key={pigment.name} className="font-mono text-xs">
            <span className="mb-1 block size-8 border border-line" style={{ backgroundColor: pigment.hex }} />
            {pigment.name}
          </li>
        ))}
      </ul>
      <h3 className="mt-5 font-mono text-xs tracking-widest text-muted uppercase">Compilador</h3>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {project.nodes.filter(isLockable).map((node) => (
          <li key={node.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 font-mono text-xs">
            <span>{node.name}</span>
            <span className="text-muted">
              {stepsFor(node)
                .map((step) => `${STEP_LABEL[step] ?? step} ${stepStatus(project, node, step)}`)
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      <h3 className="mt-5 font-mono text-xs tracking-widest text-muted uppercase">Memoria</h3>
      <ul className="mt-2 space-y-2">
        {project.decisions.length === 0 && <li className="font-mono text-xs text-muted">Todavía no hay rechazos.</li>}
        {project.decisions.slice(0, 6).map((decision) => (
          <li key={decision.id} className="font-mono text-xs">
            <span className={decision.verb === "rechazar" ? "text-accent" : "text-ink"}>{decision.verb}</span>
            <span className="text-muted"> · {decision.note}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={loadBlank}>Proyecto vacío</Button>
        <Button tone="ink" onClick={loadDemo}>
          Volver al corto
        </Button>
      </div>
    </SheetFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-2 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink tabular-nums">{value}</dd>
    </div>
  );
}
