import { useEffect, useState } from "react";
import {
  buildBrief,
  canLock,
  findNode,
  firstOpenStep,
  gatesFor,
  isLockable,
  localProposal,
  stepStatus,
  stepsFor,
  vetProposal,
} from "@/lib/norma/compile";
import { proponerConModelo } from "@/lib/norma/model.functions";
import { useStudio } from "@/lib/norma/store";
import {
  BIOME_LABEL,
  MODEL_CAP,
  STEP_LABEL,
  type Biome,
  type LockableNode,
  type Proposal,
  type StudioNode,
} from "@/lib/norma/types";
import { Button, Field, Stamp } from "./controls";

export function Inspector() {
  const project = useStudio((s) => s.project);
  const node = findNode(project, project.selectedId) ?? project.nodes[0];
  if (!node) return null;
  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-vellum md:border-l">
      <div className="px-4 py-3">
        <p className="font-mono text-xs tracking-widest text-muted uppercase">Corte</p>
        <h2 className="font-sans text-2xl leading-tight">{node.name}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <NameField node={node} />
        {isLockable(node) ? <StepEditor node={node} /> : <PlainEditor node={node} />}
        <Danger node={node} />
      </div>
    </aside>
  );
}

function NameField({ node }: { node: StudioNode }) {
  const rename = useStudio((s) => s.rename);
  return (
    <label className="mb-3 block font-mono text-xs text-muted">
      Nombre
      <input
        value={node.name}
        onChange={(event) => rename(node.id, event.target.value)}
        className="mt-1 h-11 w-full border border-line bg-sheet px-2 font-mono text-sm text-ink"
      />
    </label>
  );
}

function PlainEditor({ node }: { node: StudioNode }) {
  const project = useStudio((s) => s.project);
  const patchBible = useStudio((s) => s.patchBible);
  const setFolderBrief = useStudio((s) => s.setFolderBrief);
  const setIntent = useStudio((s) => s.setIntent);
  if (node.kind === "biblia") {
    const bible = project.bible;
    return (
      <div className="space-y-3">
        <label className="block font-mono text-xs text-muted">
          Título
          <input
            value={bible.title}
            onChange={(event) => patchBible({ title: event.target.value.slice(0, 80) })}
            className="mt-1 h-11 w-full border border-line bg-sheet px-2 text-sm text-ink"
          />
        </label>
        <label className="block font-mono text-xs text-muted">
          Logline
          <textarea
            value={bible.logline}
            onChange={(event) => patchBible({ logline: event.target.value.slice(0, 280) })}
            className="mt-1 h-24 w-full border border-line bg-sheet p-2 text-sm text-ink"
          />
        </label>
        <label className="block font-mono text-xs text-muted">
          Semilla del corto
          <input
            value={bible.seed}
            onChange={(event) =>
              patchBible({ seed: event.target.value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 8) })
            }
            className="mt-1 h-11 w-full border border-line bg-sheet px-2 text-sm text-ink tabular-nums"
          />
        </label>
        <Field label="Puerta" value={bible.doorCm} min={180} max={240} step={1} unit="cm" onChange={(doorCm) => patchBible({ doorCm })} />
        <Field label="Ancho de puerta" value={bible.doorWidthM} min={0.7} max={1.2} step={0.05} unit="m" onChange={(doorWidthM) => patchBible({ doorWidthM })} />
        <Field label="Lente de casa" value={bible.focalMm} min={18} max={85} step={1} unit="mm" onChange={(focalMm) => patchBible({ focalMm })} />
        <Field label="Sensor" value={bible.sensorMm} min={16} max={54} step={1} unit="mm" onChange={(sensorMm) => patchBible({ sensorMm })} />
        <p className="font-mono text-xs text-muted">Pigmentos. El color de un personaje solo puede salir de aquí.</p>
        {bible.pigments.map((pigment, index) => (
          <label key={pigment.name} className="flex items-center gap-2 font-mono text-xs">
            <input
              type="color"
              value={pigment.hex}
              aria-label={pigment.name}
              onChange={(event) => {
                const pigments = bible.pigments.map((item, i) =>
                  i === index ? { ...item, hex: event.target.value } : item,
                );
                patchBible({ pigments });
              }}
              className="size-11 border border-line bg-sheet"
            />
            <input
              value={pigment.name}
              onChange={(event) => {
                const pigments = bible.pigments.map((item, i) =>
                  i === index ? { ...item, name: event.target.value.slice(0, 16) } : item,
                );
                patchBible({ pigments });
              }}
              className="h-11 flex-1 border border-line bg-sheet px-2 text-ink"
            />
          </label>
        ))}
        <label className="block font-mono text-xs text-muted">
          Nunca
          <textarea
            value={bible.never.join("\n")}
            onChange={(event) =>
              patchBible({
                never: event.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .slice(0, 8),
              })
            }
            className="mt-1 h-28 w-full border border-line bg-sheet p-2 text-sm text-ink"
          />
        </label>
      </div>
    );
  }
  if (node.kind === "carpeta") {
    return (
      <label className="block font-mono text-xs text-muted">
        Nota de carpeta
        <textarea
          value={node.brief}
          onChange={(event) => setFolderBrief(node.id, event.target.value)}
          className="mt-1 h-28 w-full border border-line bg-sheet p-2 text-sm text-ink"
        />
      </label>
    );
  }
  if (node.kind === "secuencia") {
    return (
      <label className="block font-mono text-xs text-muted">
        Intención del bloque
        <textarea
          value={node.intent}
          onChange={(event) => setIntent(node.id, event.target.value)}
          className="mt-1 h-28 w-full border border-line bg-sheet p-2 text-sm text-ink"
        />
      </label>
    );
  }
  return null;
}

function StepEditor({ node }: { node: LockableNode }) {
  const project = useStudio((s) => s.project);
  const steps = stepsFor(node);
  const [active, setActive] = useState(firstOpenStep(project, node));
  useEffect(() => {
    setActive(firstOpenStep(useStudio.getState().project, node));
  }, [node.id]);
  const step = steps.includes(active) ? active : steps[0] ?? "";
  const status = stepStatus(project, node, step);
  const previousIndex = steps.indexOf(step) - 1;
  const previous = previousIndex >= 0 ? steps[previousIndex] : null;
  const previousOk = !previous || stepStatus(project, node, previous) === "firmado";
  const editable = status !== "firmado" && (status === "sucio" || previousOk);
  const gates = gatesFor(project, node, step);
  const blocked = gates.some((gate) => gate.level === "falla") || !canLock(project, node, step);

  return (
    <div>
      <ol className="mb-3 space-y-1">
        {steps.map((item) => {
          const itemStatus = stepStatus(project, node, item);
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => setActive(item)}
                className={`flex h-11 w-full items-center justify-between border px-2 font-mono text-xs ${item === step ? "border-ink bg-sheet" : "border-line"}`}
              >
                <span>{STEP_LABEL[item] ?? item}</span>
                <span className={itemStatus === "sucio" ? "text-accent" : "text-muted"}>{itemStatus}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="space-y-1 border border-line bg-sheet px-3 py-2">
        {gates.map((gate) => (
          <Stamp key={gate.text} tone={gate.level}>
            {gate.text}
          </Stamp>
        ))}
      </div>
      <div className="mt-3">
        <StepFields node={node} step={step} disabled={!editable} />
      </div>
      {editable && <Propose node={node} step={step} />}
      <div className="mt-3 flex flex-wrap gap-2">
        <LockButton node={node} step={step} disabled={blocked || status === "firmado"} />
        {status !== "abierto" && <ReopenButton node={node} step={step} />}
      </div>
      {!previousOk && status === "abierto" && (
        <p className="mt-2 font-mono text-xs text-accent">Antes hay que firmar {STEP_LABEL[previous ?? ""] ?? previous}.</p>
      )}
    </div>
  );
}

function LockButton({ node, step, disabled }: { node: LockableNode; step: string; disabled: boolean }) {
  const lockStep = useStudio((s) => s.lockStep);
  return (
    <Button tone="ink" disabled={disabled} onClick={() => lockStep(node.id, step)}>
      Firmar paso
    </Button>
  );
}

function ReopenButton({ node, step }: { node: LockableNode; step: string }) {
  const reopen = useStudio((s) => s.reopen);
  return (
    <Button onClick={() => reopen(node.id, step)}>Reabrir firma</Button>
  );
}

function StepFields({ node, step, disabled }: { node: LockableNode; step: string; disabled: boolean }) {
  const patchCharacter = useStudio((s) => s.patchCharacter);
  const patchLocation = useStudio((s) => s.patchLocation);
  const patchShot = useStudio((s) => s.patchShot);
  const project = useStudio((s) => s.project);
  if (node.kind === "personaje") {
    const m = node.metrics;
    if (step === "metricas") {
      return (
        <>
          <Field label="Estatura" unit="cm" value={m.heightCm} min={140} max={210} step={1} disabled={disabled} onChange={(heightCm) => patchCharacter(node.id, { heightCm })} />
          <Field label="Cabezas" value={m.heads} min={5.5} max={8.4} step={0.1} disabled={disabled} onChange={(heads) => patchCharacter(node.id, { heads })} />
          <Field label="Hombro" value={m.shoulderY} min={0.14} max={0.28} step={0.01} disabled={disabled} onChange={(shoulderY) => patchCharacter(node.id, { shoulderY })} />
          <Field label="Cadera" value={m.hipY} min={0.4} max={0.56} step={0.01} disabled={disabled} onChange={(hipY) => patchCharacter(node.id, { hipY })} />
          <Field label="Ancho" value={m.shoulderW} min={0.18} max={0.36} step={0.01} disabled={disabled} onChange={(shoulderW) => patchCharacter(node.id, { shoulderW })} />
          <Field label="Línea de ojos" value={m.eyeLine} min={0.38} max={0.6} step={0.01} disabled={disabled} onChange={(eyeLine) => patchCharacter(node.id, { eyeLine })} />
          <Field label="Brazo" value={m.arm} min={0.28} max={0.48} step={0.01} disabled={disabled} onChange={(arm) => patchCharacter(node.id, { arm })} />
        </>
      );
    }
    if (step === "construccion") {
      return <p className="font-mono text-xs text-muted">Frente y perfil ya están dibujados con las métricas. Firmar es aceptar que no hay un segundo diseño.</p>;
    }
    if (step === "boceto") {
      return (
        <>
          <Field label="Peso de línea" value={m.lineWeight} min={0.8} max={3.2} step={0.1} disabled={disabled} onChange={(lineWeight) => patchCharacter(node.id, { lineWeight })} />
          <Field label="Asimetría" value={m.asymmetry} min={0} max={0.16} step={0.01} disabled={disabled} onChange={(asymmetry) => patchCharacter(node.id, { asymmetry })} />
        </>
      );
    }
    return (
      <div className="space-y-2">
        <Swatches label="Piel" value={m.piel} disabled={disabled} onChange={(piel) => patchCharacter(node.id, { piel })} />
        <Swatches label="Ropa" value={m.ropa} disabled={disabled} onChange={(ropa) => patchCharacter(node.id, { ropa })} />
        <Swatches label="Pelo" value={m.pelo} disabled={disabled} onChange={(pelo) => patchCharacter(node.id, { pelo })} />
      </div>
    );
  }
  if (node.kind === "locacion") {
    const p = node.params;
    if (step === "semilla") {
      return (
        <label className="block font-mono text-xs text-muted">
          Semilla de este lugar
          <input
            disabled={disabled}
            value={p.seed}
            onChange={(event) =>
              patchLocation(node.id, { seed: event.target.value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 8) })
            }
            className="mt-1 h-11 w-full border border-line bg-sheet px-2 text-sm text-ink disabled:opacity-40"
          />
        </label>
      );
    }
    if (step === "relieve") {
      return (
        <>
          <label className="block py-1 font-mono text-xs text-muted">
            Bioma
            <select
              disabled={disabled}
              value={p.biome}
              onChange={(event) => patchLocation(node.id, { biome: event.target.value as Biome })}
              className="mt-1 h-11 w-full border border-line bg-sheet px-2 text-ink disabled:opacity-40"
            >
              {(Object.keys(BIOME_LABEL) as Biome[]).map((biome) => (
                <option key={biome} value={biome}>
                  {BIOME_LABEL[biome]}
                </option>
              ))}
            </select>
          </label>
          <Field label="Elevación" value={p.elevation} min={0.05} max={1} step={0.01} disabled={disabled} onChange={(elevation) => patchLocation(node.id, { elevation })} />
          <Field label="Humedad" value={p.moisture} min={0} max={1} step={0.01} disabled={disabled} onChange={(moisture) => patchLocation(node.id, { moisture })} />
          <Field label="Ancho" unit="m" value={p.metersWide} min={6} max={160} step={1} disabled={disabled} onChange={(metersWide) => patchLocation(node.id, { metersWide })} />
          <Field label="Fondo" unit="m" value={p.metersDeep} min={4} max={80} step={1} disabled={disabled} onChange={(metersDeep) => patchLocation(node.id, { metersDeep })} />
          {p.biome === "interior" && (
            <Field label="Altura libre" unit="m" value={p.ceilingM} min={1.8} max={4} step={0.05} disabled={disabled} onChange={(ceilingM) => patchLocation(node.id, { ceilingM })} />
          )}
        </>
      );
    }
    return <Field label="Hora" value={p.hour} min={0} max={24} step={0.5} disabled={disabled} onChange={(hour) => patchLocation(node.id, { hour })} />;
  }
  const shot = node.shot;
  const characters = project.nodes.filter((item) => item.kind === "personaje");
  const locations = project.nodes.filter((item) => item.kind === "locacion");
  if (step === "bloqueo") {
    return <p className="font-mono text-xs text-muted">Bloqueo no inventa otra imagen. Firma el encuadre si las fallas están en cero.</p>;
  }
  return (
    <>
      <label className="block py-1 font-mono text-xs text-muted">
        Personaje
        <select
          disabled={disabled}
          value={shot.characterId}
          onChange={(event) => patchShot(node.id, { characterId: event.target.value })}
          className="mt-1 h-11 w-full border border-line bg-sheet px-2 text-ink disabled:opacity-40"
        >
          <option value="">Ninguno</option>
          {characters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block py-1 font-mono text-xs text-muted">
        Locación
        <select
          disabled={disabled}
          value={shot.locationId}
          onChange={(event) => patchShot(node.id, { locationId: event.target.value })}
          className="mt-1 h-11 w-full border border-line bg-sheet px-2 text-ink disabled:opacity-40"
        >
          <option value="">Ninguna</option>
          {locations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <Field label="Distancia" unit="m" value={shot.distanceM} min={0.8} max={30} step={0.1} disabled={disabled} onChange={(distanceM) => patchShot(node.id, { distanceM })} />
      <Field label="Lente" unit="mm" value={shot.focalMm} min={18} max={85} step={1} disabled={disabled} onChange={(focalMm) => patchShot(node.id, { focalMm })} />
      <Field label="Inclinación" unit="°" value={shot.tiltDeg} min={-20} max={25} step={1} disabled={disabled} onChange={(tiltDeg) => patchShot(node.id, { tiltDeg })} />
      <label className="flex h-11 items-center gap-2 font-mono text-xs">
        <input
          type="checkbox"
          checked={shot.centered}
          disabled={disabled}
          onChange={(event) => patchShot(node.id, { centered: event.target.checked })}
        />
        Centrar (plano de poder)
      </label>
    </>
  );
}

function Swatches({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (index: number) => void;
}) {
  const pigments = useStudio((s) => s.project.bible.pigments);
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 font-mono text-xs text-muted">{label}</span>
      {pigments.map((pigment, index) => (
        <button
          key={pigment.name}
          type="button"
          disabled={disabled}
          aria-label={pigment.name}
          onClick={() => onChange(index)}
          className={`size-11 border disabled:opacity-40 ${index === value ? "border-ink" : "border-line"}`}
          style={{ backgroundColor: pigment.hex }}
        />
      ))}
    </div>
  );
}

function Propose({ node, step }: { node: LockableNode; step: string }) {
  const project = useStudio((s) => s.project);
  const applyFields = useStudio((s) => s.applyFields);
  const addDecision = useStudio((s) => s.addDecision);
  const recordModelCall = useStudio((s) => s.recordModelCall);
  const [pending, setPending] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPending(null);
    setError(null);
  }, [node.id, step]);

  const math = localProposal(project, node, step);
  const capped = project.modelCalls >= MODEL_CAP;
  if (!math) return null;
  return (
    <div className="mt-3 border border-line bg-sheet p-3">
      <p className="font-mono text-xs text-muted">
        Consultas {project.modelCalls}/{MODEL_CAP}. La matemática no gasta.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {math && (
          <Button
            onClick={() => {
              setError(null);
              setPending(math);
            }}
          >
            Proponer números
          </Button>
        )}
        {math && (
          <Button
            disabled={busy || capped}
            onClick={() => {
              setBusy(true);
              setError(null);
              void proponerConModelo({ data: { brief: buildBrief(project, node, step) } })
                .then((result) => {
                  if (!result.ok) {
                    if (!result.error.includes("no está conectado")) recordModelCall();
                    setError(result.error);
                    return;
                  }
                  recordModelCall();
                  const raw = parseModelJson(result.text);
                  if (!raw) {
                    setError("No vino JSON. No se aplicó nada.");
                    addDecision({ nodeId: node.id, verb: "rechazar", note: "Respuesta ilegible del modelo.", fields: {} });
                    return;
                  }
                  const vetted = vetProposal(project, node, step, raw);
                  if (!vetted.ok) {
                    setError(vetted.reason);
                    addDecision({ nodeId: node.id, verb: "rechazar", note: vetted.reason, fields: {} });
                    return;
                  }
                  setPending(vetted.proposal);
                })
                .catch(() => setError("La consulta no salió. No se aplicó nada."))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Consultando" : capped ? "Cupo agotado" : "Pedir al modelo"}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 font-mono text-xs text-accent">{error}</p>}
      {pending && (
        <div className="mt-3 border border-ink p-2">
          <p className="font-mono text-xs text-ink">{pending.note}</p>
          <p className="mt-1 font-mono text-xs text-muted tabular-nums">
            {Object.entries(pending.fields)
              .map(([key, value]) => `${key} ${value}`)
              .join(" · ")}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              tone="ink"
              onClick={() => {
                applyFields(node.id, pending.fields);
                addDecision({
                  nodeId: node.id,
                  verb: "aceptar",
                  note: pending.note,
                  fields: pending.fields,
                });
                setPending(null);
              }}
            >
              Aplicar
            </Button>
            <Button
              onClick={() => {
                addDecision({
                  nodeId: node.id,
                  verb: "rechazar",
                  note: pending.note,
                  fields: pending.fields,
                });
                setPending(null);
              }}
            >
              Rechazar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function parseModelJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value: unknown = JSON.parse(text.slice(start, end + 1));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function Danger({ node }: { node: StudioNode }) {
  const removeNode = useStudio((s) => s.removeNode);
  const [armed, setArmed] = useState(false);
  useEffect(() => setArmed(false), [node.id]);
  if (node.kind === "biblia") return null;
  return (
    <div className="mt-6">
      {armed ? (
        <Button tone="accent" onClick={() => removeNode(node.id)}>
          Confirmar borrado
        </Button>
      ) : (
        <Button onClick={() => setArmed(true)}>Borrar</Button>
      )}
    </div>
  );
}
