import type { CharacterNode, Project } from "@/lib/norma/types";
import { SheetFrame } from "./SheetFrame";

export function CharacterPlate({ project, node }: { project: Project; node: CharacterNode }) {
  const m = node.metrics;
  const door = project.bible.doorCm;
  const span = Math.max(m.heightCm, door);
  const scale = 430 / span;
  const top = 28;
  const ground = top + span * scale;
  const y = (fromTop: number) => top + fromTop * scale;
  const head = m.heightCm / m.heads;
  const chin = head;
  const eye = head * m.eyeLine;
  const shoulder = m.heightCm * m.shoulderY;
  const hip = m.heightCm * m.hipY;
  const knee = hip + (m.heightCm - hip) * 0.52;
  const foot = m.heightCm;
  const shoulderHalf = (m.heightCm * m.shoulderW) / 2;
  const hipHalf = shoulderHalf * 0.78;
  const headHalf = head * 0.38;
  const arm = m.heightCm * m.arm;
  const shift = m.asymmetry * head;
  const piel = project.bible.pigments[m.piel]?.hex ?? project.bible.pigments[0]?.hex ?? "#e4d5bc";
  const ropa = project.bible.pigments[m.ropa]?.hex ?? piel;
  const pelo = project.bible.pigments[m.pelo]?.hex ?? piel;
  const stroke = Math.max(1.25, m.lineWeight);

  return (
    <SheetFrame
      kicker={`${project.bible.title} · personaje`}
      title={node.name}
      meta={`${Math.round(m.heightCm)} cm · ${m.heads.toFixed(1)} cabezas`}
    >
      <svg viewBox="0 0 640 500" className="h-auto w-full" role="img" aria-label={`Construcción de ${node.name}`}>
        <line x1={40} x2={600} y1={y(chin)} y2={y(chin)} className="stroke-line" strokeDasharray="3 4" />
        <line x1={40} x2={600} y1={y(shoulder)} y2={y(shoulder)} className="stroke-line" strokeDasharray="3 4" />
        <line x1={40} x2={600} y1={y(hip)} y2={y(hip)} className="stroke-line" strokeDasharray="3 4" />
        <line x1={40} x2={600} y1={y(knee)} y2={y(knee)} className="stroke-line" strokeDasharray="3 4" />
        <line x1={40} x2={600} y1={ground} y2={ground} className="stroke-ink" />
        <rect
          x={46}
          y={y(door)}
          width={Math.max(8, project.bible.doorWidthM * 100 * scale)}
          height={door * scale}
          className="fill-none stroke-accent"
          strokeWidth={1.5}
        />
        <text x={46} y={y(door) - 6} className="fill-accent font-mono text-xs">
          puerta {door} cm
        </text>
        {Array.from({ length: Math.ceil(m.heads) }, (_, i) => (
          <line
            key={i}
            x1={168}
            x2={176}
            y1={y((i * m.heightCm) / m.heads)}
            y2={y((i * m.heightCm) / m.heads)}
            className="stroke-muted"
          />
        ))}
        <Figure
          cx={250}
          side={false}
          y={y}
          chin={chin}
          eye={eye}
          shoulder={shoulder}
          hip={hip}
          knee={knee}
          foot={foot}
          head={head}
          headHalf={headHalf}
          shoulderHalf={shoulderHalf}
          hipHalf={hipHalf}
          arm={arm}
          shift={shift}
          stroke={stroke}
          piel={piel}
          ropa={ropa}
          pelo={pelo}
        />
        <Figure
          cx={470}
          side
          y={y}
          chin={chin}
          eye={eye}
          shoulder={shoulder}
          hip={hip}
          knee={knee}
          foot={foot}
          head={head}
          headHalf={headHalf * 0.86}
          shoulderHalf={shoulderHalf * 0.42}
          hipHalf={hipHalf * 0.5}
          arm={arm}
          shift={shift}
          stroke={stroke}
          piel={piel}
          ropa={ropa}
          pelo={pelo}
        />
        <text x={250} y={ground + 22} textAnchor="middle" className="fill-muted font-mono text-xs">
          frente
        </text>
        <text x={470} y={ground + 22} textAnchor="middle" className="fill-muted font-mono text-xs">
          perfil
        </text>
      </svg>
      <p className="mt-2 font-mono text-xs text-muted">
        Las dos vistas comparten las mismas líneas. Cambiar un número no genera otro dibujo: mueve este.
      </p>
    </SheetFrame>
  );
}

function Figure({
  cx,
  side,
  y,
  chin,
  eye,
  shoulder,
  hip,
  knee,
  foot,
  head,
  headHalf,
  shoulderHalf,
  hipHalf,
  arm,
  shift,
  stroke,
  piel,
  ropa,
  pelo,
}: {
  cx: number;
  side: boolean;
  y: (cm: number) => number;
  chin: number;
  eye: number;
  shoulder: number;
  hip: number;
  knee: number;
  foot: number;
  head: number;
  headHalf: number;
  shoulderHalf: number;
  hipHalf: number;
  arm: number;
  shift: number;
  stroke: number;
  piel: string;
  ropa: string;
  pelo: string;
}) {
  const headCy = (y(0) + y(chin)) / 2;
  const rx = headHalf;
  const ry = (y(chin) - y(0)) / 2;
  const armEnd = shoulder + arm * 0.72;
  const hand = hip + arm * 0.15;
  return (
    <g strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <line x1={cx} x2={cx} y1={y(0)} y2={y(foot)} className="stroke-line" strokeDasharray="2 3" strokeWidth={1} />
      <ellipse cx={cx} cy={headCy - ry * 0.72} rx={rx * 0.92} ry={ry * 0.55} fill={pelo} className="stroke-ink" />
      <ellipse cx={cx} cy={headCy} rx={rx} ry={ry} fill={piel} className="stroke-ink" />
      <line x1={cx} x2={cx} y1={y(chin)} y2={y(shoulder)} className="stroke-ink" />
      <path
        d={`M ${cx - shoulderHalf} ${y(shoulder)} L ${cx + shoulderHalf} ${y(shoulder + (side ? 0 : shift))} L ${cx + hipHalf} ${y(hip)} L ${cx - hipHalf} ${y(hip)} Z`}
        fill={ropa}
        className="stroke-ink"
      />
      {!side && (
        <>
          <line
            x1={cx - shoulderHalf}
            y1={y(shoulder)}
            x2={cx - shoulderHalf - head * 0.35}
            y2={y(armEnd)}
            className="stroke-ink"
          />
          <line
            x1={cx - shoulderHalf - head * 0.35}
            y1={y(armEnd)}
            x2={cx - hipHalf}
            y2={y(hand)}
            className="stroke-ink"
          />
          <line
            x1={cx + shoulderHalf}
            y1={y(shoulder + shift)}
            x2={cx + shoulderHalf + head * 0.35}
            y2={y(armEnd + shift)}
            className="stroke-ink"
          />
          <line
            x1={cx + shoulderHalf + head * 0.35}
            y1={y(armEnd + shift)}
            x2={cx + hipHalf}
            y2={y(hand)}
            className="stroke-ink"
          />
          <line x1={cx - rx * 0.45} x2={cx - rx * 0.1} y1={y(eye)} y2={y(eye)} className="stroke-ink" />
          <line
            x1={cx + rx * 0.15 + shift}
            x2={cx + rx * 0.5 + shift}
            y1={y(eye)}
            y2={y(eye)}
            className="stroke-ink"
          />
        </>
      )}
      {side && (
        <>
          <line x1={cx + rx * 0.2} x2={cx + rx * 0.95} y1={y(eye)} y2={y(chin * 0.72)} className="stroke-ink" />
          <line x1={cx} y1={y(shoulder)} x2={cx + head * 0.2} y2={y(armEnd)} className="stroke-ink" />
          <line x1={cx + head * 0.2} y1={y(armEnd)} x2={cx} y2={y(hand)} className="stroke-ink" />
        </>
      )}
      <line x1={cx - hipHalf * 0.4} y1={y(hip)} x2={cx - hipHalf * 0.55} y2={y(knee)} className="stroke-ink" />
      <line x1={cx - hipHalf * 0.55} y1={y(knee)} x2={cx - hipHalf * 0.3} y2={y(foot)} className="stroke-ink" />
      <line x1={cx + hipHalf * 0.4} y1={y(hip)} x2={cx + hipHalf * 0.55} y2={y(knee)} className="stroke-ink" />
      <line x1={cx + hipHalf * 0.55} y1={y(knee)} x2={cx + hipHalf * 0.35} y2={y(foot)} className="stroke-ink" />
      {Array.from({ length: 4 }, (_, i) => (
        <line
          key={i}
          x1={cx + shoulderHalf * 0.35}
          x2={cx + hipHalf * 0.2}
          y1={y(shoulder + (hip - shoulder) * (0.2 + i * 0.18))}
          y2={y(shoulder + (hip - shoulder) * (0.32 + i * 0.18))}
          className="stroke-ink"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}
