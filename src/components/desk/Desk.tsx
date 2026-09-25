import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  Clapperboard,
  Download,
  FlipHorizontal,
  Image as ImageIcon,
  Lock,
  Map,
  Palette,
  Plus,
  Send,
  Settings,
  Upload,
  UserRound,
} from "lucide-react";
import { Button, Field } from "@/components/desk/controls";
import { dirigir, type CallArgs } from "@/lib/desk/deepseek.functions";
import { getBlob, putBlob } from "@/lib/desk/idb";
import { generarLamina } from "@/lib/desk/image.functions";
import { dataUrlToBlob, exportScene, extractPalette, keyPaper, shrinkSrc } from "@/lib/desk/images";
import { loadKeys, saveKeys } from "@/lib/desk/keys";
import { activeSrc, emptySpec, nid, selectedAsset, useDesk } from "@/lib/desk/store";
import { VIEW_LABEL, type Asset, type AssetKind, type SceneLayer, type Take, type ViewName } from "@/lib/desk/types";

function useResolvedSrc(src: string | null): string {
  const [url, setUrl] = useState(src && !src.startsWith("idb:") ? src : "");
  useEffect(() => {
    if (!src) {
      setUrl("");
      return;
    }
    if (!src.startsWith("idb:")) {
      setUrl(src);
      return;
    }
    let revoked = "";
    let cancel = false;
    void getBlob(src.slice(4)).then((blob) => {
      if (!blob || cancel) return;
      revoked = URL.createObjectURL(blob);
      setUrl(revoked);
    });
    return () => {
      cancel = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);
  return url;
}

function useCutout(src: string | null): string {
  const url = useResolvedSrc(src);
  const [cut, setCut] = useState("");
  useEffect(() => {
    if (!url) {
      setCut("");
      return;
    }
    let cancel = false;
    void keyPaper(url).then((png) => {
      if (!cancel) setCut(png);
    });
    return () => {
      cancel = true;
    };
  }, [url]);
  return cut;
}

const KIND_ICON = { personaje: UserRound, fondo: Map, escena: Clapperboard, prop: ImageIcon };

export function Desk() {
  const project = useDesk((s) => s.project);
  const pane = useDesk((s) => s.pane);
  const setPane = useDesk((s) => s.setPane);
  const asset = selectedAsset(project);
  const [settings, setSettings] = useState(false);
  const [keys, setKeys] = useState({ deepseek: "", image: "" });

  useEffect(() => {
    void useDesk.persist.rehydrate();
    setKeys(loadKeys());
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-vellum text-ink">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-3 md:px-4">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">NORMA · escritorio de diseño</p>
          <h1 className="truncate font-sans text-2xl leading-none">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-mono text-xs text-muted tabular-nums">
            Láminas pedidas <span className="text-ink">{project.platesSpent}</span>
          </p>
          <Button onClick={() => setSettings((open) => !open)} aria-label="Ajustes">
            <Settings className="size-4" />
          </Button>
        </div>
      </header>
      {settings && (
        <SettingsBar
          keys={keys}
          onChange={setKeys}
          onSave={() => {
            saveKeys(keys);
            setSettings(false);
          }}
        />
      )}
      <div className="flex gap-1 border-b border-line p-2 md:hidden">
        <PaneButton current={pane} id="archivo" label="Archivo" />
        <PaneButton current={pane} id="mesa" label="Mesa" />
        <PaneButton current={pane} id="director" label="Director" />
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[16rem_minmax(0,1fr)_22rem]">
        <div className={pane === "archivo" ? "min-h-0" : "hidden md:block"}>
          <Tree />
        </div>
        <main className={`${pane === "mesa" ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden`}>
          {asset ? <Stage asset={asset} keys={keys} /> : null}
        </main>
        <div className={pane === "director" ? "min-h-0" : "hidden md:block"}>
          <Director keys={keys} />
        </div>
      </div>
    </div>
  );
}

function PaneButton({ current, id, label }: { current: string; id: "archivo" | "mesa" | "director"; label: string }) {
  const setPane = useDesk((s) => s.setPane);
  return (
    <button
      type="button"
      onClick={() => setPane(id)}
      className={`h-11 flex-1 font-mono text-xs tracking-wide uppercase ${current === id ? "bg-ink text-sheet" : "border border-line bg-sheet"}`}
    >
      {label}
    </button>
  );
}

function SettingsBar({
  keys,
  onChange,
  onSave,
}: {
  keys: { deepseek: string; image: string };
  onChange: (keys: { deepseek: string; image: string }) => void;
  onSave: () => void;
}) {
  return (
    <form
      className="grid gap-2 border-b border-line bg-sheet px-3 py-3 md:grid-cols-[1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <label className="font-mono text-xs text-muted">
        Clave DeepSeek · el director
        <input
          type="password"
          value={keys.deepseek}
          autoComplete="off"
          onChange={(event) => onChange({ ...keys, deepseek: event.target.value })}
          className="mt-1 h-11 w-full border border-line bg-vellum px-2 text-ink"
          placeholder="sk-..."
        />
      </label>
      <label className="font-mono text-xs text-muted">
        Clave de imagen · solo si tu máquina no la trae
        <input
          type="password"
          value={keys.image}
          autoComplete="off"
          onChange={(event) => onChange({ ...keys, image: event.target.value })}
          className="mt-1 h-11 w-full border border-line bg-vellum px-2 text-ink"
        />
      </label>
      <div className="flex items-end">
        <Button tone="ink" type="submit">
          Guardar aquí
        </Button>
      </div>
    </form>
  );
}

function Tree() {
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
    <aside className="flex h-full min-h-0 flex-col border-line md:border-r">
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {groups.map((group) => {
          const Icon = KIND_ICON[group.kind];
          const items = project.assets.filter((asset) => asset.kind === group.kind);
          return (
            <div key={group.kind} className="mb-2">
              <div className="flex items-center justify-between px-3 py-1">
                <p className="font-mono text-xs tracking-widest text-muted uppercase">{group.label}</p>
                <button
                  type="button"
                  className="flex size-11 items-center justify-center"
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
              {items.length === 0 && <p className="px-3 font-mono text-xs text-muted">Vacío.</p>}
              {items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => select(asset.id)}
                  className={`flex h-11 w-full items-center gap-2 px-3 text-left font-mono text-xs ${asset.id === project.selectedId ? "bg-ink text-sheet" : ""}`}
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

function Stage({ asset, keys }: { asset: Asset; keys: { deepseek: string; image: string } }) {
  const src = activeSrc(asset);
  const url = useResolvedSrc(src);
  const setActiveTake = useDesk((s) => s.setActiveTake);
  const rename = useDesk((s) => s.rename);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState<ViewName | null>(null);
  const [board, setBoard] = useState<"toma" | "hoja">("toma");
  const [guide, setGuide] = useState(false);

  async function run(view: ViewName, prompt?: string) {
    setError(null);
    setBusy(view);
    setArmed(null);
    try {
      await mintPlate(asset, view, keys.image, prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir la lámina");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <input
          value={asset.name}
          onChange={(event) => rename(asset.id, event.target.value)}
          className="h-11 min-w-0 flex-1 bg-transparent font-sans text-2xl text-ink outline-none"
        />
        <span className="font-mono text-xs text-muted uppercase">{asset.kind}</span>
      </div>
      {asset.kind === "escena" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SceneBoard asset={asset} />
        </div>
      ) : (
        <>
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2">
            {asset.takes.map((take) => (
              <button
                key={take.id}
                type="button"
                onClick={() => setActiveTake(asset.id, take.id)}
                className={`h-11 shrink-0 px-3 font-mono text-xs ${take.id === asset.activeTakeId ? "bg-ink text-sheet" : "border border-line bg-sheet"}`}
              >
                {take.label}
                {take.locked ? " · fija" : ""}
              </button>
            ))}
            {asset.takes.length === 0 && <p className="font-mono text-xs text-muted">Todavía no hay lámina. Sube un boceto o pide una.</p>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid place-items-center bg-sheet p-4">
              {board === "hoja" && asset.kind === "personaje" ? (
                <ModelSheet asset={asset} />
              ) : url ? (
                <div className="relative inline-block">
                  <img src={url} alt={asset.name} className="max-h-80 w-auto object-contain" />
                  {guide && asset.kind === "personaje" && <HeadGuide />}
                </div>
              ) : (
                <p className="font-mono text-xs text-muted">Mesa vacía. Sube un boceto o pide una vista.</p>
              )}
            </div>
            {asset.kind === "personaje" && <Ficha asset={asset} />}
          </div>
          <ToolRow
            asset={asset}
            busy={busy}
            armed={armed}
            board={board}
            guide={guide}
            onBoard={setBoard}
            onGuide={setGuide}
            onArm={setArmed}
            onRun={(view) => void run(view)}
          />
        </>
      )}
      {error && <p className="px-3 py-2 font-mono text-xs text-accent">{error}</p>}
    </div>
  );
}

function HeadGuide() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="absolute right-0 left-0 border-t border-accent" style={{ top: `${(i / 8) * 100}%` }} />
      ))}
    </div>
  );
}

function ModelSheet({ asset }: { asset: Asset }) {
  return (
    <div className="flex w-full items-end gap-3 overflow-x-auto">
      {asset.takes.map((take) => (
        <SheetTake key={take.id} take={take} />
      ))}
      {asset.takes.length === 0 && <p className="font-mono text-xs text-muted">La hoja se llena con las vistas que fijes.</p>}
    </div>
  );
}

function SheetTake({ take }: { take: Take }) {
  const url = useResolvedSrc(take.src);
  return (
    <figure className="w-36 shrink-0">
      {url ? <img src={url} alt={take.label} className="h-72 w-full object-contain object-bottom" /> : null}
      <figcaption className="mt-1 text-center font-mono text-xs text-muted">{take.label}</figcaption>
    </figure>
  );
}

function ToolRow({
  asset,
  busy,
  armed,
  board,
  guide,
  onBoard,
  onGuide,
  onArm,
  onRun,
}: {
  asset: Asset;
  busy: string | null;
  armed: ViewName | null;
  board: "toma" | "hoja";
  guide: boolean;
  onBoard: (board: "toma" | "hoja") => void;
  onGuide: (guide: boolean) => void;
  onArm: (view: ViewName | null) => void;
  onRun: (view: ViewName) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const lockTake = useDesk((s) => s.lockTake);
  const pushTrace = useDesk((s) => s.pushTrace);
  const patchSpec = useDesk((s) => s.patchSpec);
  const placeLayer = useDesk((s) => s.placeLayer);
  const select = useDesk((s) => s.select);
  const project = useDesk((s) => s.project);
  const src = activeSrc(asset);
  const url = useResolvedSrc(src);

  async function upload(file: File) {
    const local = URL.createObjectURL(file);
    try {
      const dataUrl = await shrinkSrc(local, 1280);
      const id = nid();
      await putBlob(id, dataUrlToBlob(dataUrl));
      const view: ViewName = asset.kind === "fondo" ? "fondo" : "boceto";
      const next: Take = {
        id: `${view}-${id}`,
        view,
        label: file.name.replace(/\.[^.]+$/, "").slice(0, 24) || VIEW_LABEL[view],
        src: `idb:${id}`,
        locked: false,
        cost: 0,
      };
      useDesk.getState().addTake(asset.id, next);
      pushTrace({ role: "tool", tool: "subir", text: `Boceto cargado en ${asset.name}. Cuesta 0.`, cost: 0 });
    } finally {
      URL.revokeObjectURL(local);
    }
  }

  async function readPalette() {
    if (!url) return;
    const palette = await extractPalette(url);
    patchSpec(asset.id, { palette });
    pushTrace({ role: "tool", tool: "paleta", text: `Paleta de ${asset.name}: ${palette.join(" ")}`, cost: 0 });
  }

  function place() {
    if (!src) return;
    const scene = project.assets.find((item) => item.kind === "escena");
    if (!scene) return;
    const existing = scene.scene?.layers.find((layer) => layer.name === asset.name);
    placeLayer(scene.id, {
      id: existing?.id ?? nid(),
      name: asset.name,
      src,
      x: existing?.x ?? 0.58,
      y: existing?.y ?? 0.24,
      scale: existing?.scale ?? 0.68,
      flip: existing?.flip ?? false,
    });
    select(scene.id);
    pushTrace({ role: "tool", tool: "componer_escena", text: `${asset.name} entra a ${scene.name}. El papel se recorta aquí. 0 láminas.`, cost: 0 });
  }

  const views: ViewName[] =
    asset.kind === "fondo" ? ["fondo"] : asset.kind === "prop" ? ["prop"] : ["frente", "perfil", "tres_cuartos", "espalda", "expresion"];

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-line bg-vellum p-3">
      <div className="flex flex-wrap gap-2">
        <p className="flex h-11 items-center font-mono text-xs tracking-widest text-muted uppercase">Cuesta 0</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        <Button onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Subir
        </Button>
        <Button onClick={() => void readPalette()} disabled={!url}>
          <Palette className="size-4" /> Paleta
        </Button>
        {asset.kind === "personaje" && (
          <Button tone={guide ? "ink" : "ghost"} onClick={() => onGuide(!guide)}>
            Guía
          </Button>
        )}
        {asset.kind === "personaje" && (
          <Button tone={board === "hoja" ? "ink" : "ghost"} onClick={() => onBoard(board === "hoja" ? "toma" : "hoja")}>
            Hoja
          </Button>
        )}
        {(asset.kind === "personaje" || asset.kind === "prop") && (
          <Button onClick={place} disabled={!src}>
            Poner en la escena
          </Button>
        )}
        {asset.activeTakeId && (
          <Button
            onClick={() => {
              lockTake(asset.id, asset.activeTakeId as string);
              pushTrace({ role: "tool", tool: "fijar", text: `Toma fijada en ${asset.name}.`, cost: 0 });
            }}
          >
            <Lock className="size-4" /> Fijar
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <p className="flex h-11 items-center font-mono text-xs tracking-widest text-muted uppercase">Una lámina</p>
        {views.map((view) => (
          <Button
            key={view}
            tone={armed === view ? "accent" : "ghost"}
            disabled={Boolean(busy)}
            onClick={() => {
              if (armed === view) onRun(view);
              else onArm(view);
            }}
          >
            {busy === view ? "Pidiendo" : armed === view ? `Confirmar ${VIEW_LABEL[view]}` : VIEW_LABEL[view]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Ficha({ asset }: { asset: Asset }) {
  const patchSpec = useDesk((s) => s.patchSpec);
  const spec = asset.spec;
  return (
    <div className="grid gap-3 border-t border-line p-3 md:grid-cols-2">
      <label className="font-mono text-xs text-muted">
        Oficio
        <textarea
          value={spec.role}
          onChange={(event) => patchSpec(asset.id, { role: event.target.value.slice(0, 240) })}
          className="mt-1 h-20 w-full border border-line bg-sheet p-2 text-sm text-ink"
        />
      </label>
      <label className="font-mono text-xs text-muted">
        Vestuario que no se negocia
        <textarea
          value={spec.costume}
          onChange={(event) => patchSpec(asset.id, { costume: event.target.value.slice(0, 320) })}
          className="mt-1 h-20 w-full border border-line bg-sheet p-2 text-sm text-ink"
        />
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        {spec.palette.map((hex) => (
          <span key={hex} className="flex items-center gap-2 font-mono text-xs">
            <span className="size-8 border border-line" style={{ backgroundColor: hex }} />
            {hex}
          </span>
        ))}
        {spec.palette.length === 0 && <span className="font-mono text-xs text-muted">Sin paleta. Extráela de la lámina.</span>}
      </div>
    </div>
  );
}

function SceneBoard({ asset }: { asset: Asset }) {
  const project = useDesk((s) => s.project);
  const setLayer = useDesk((s) => s.setLayer);
  const removeLayer = useDesk((s) => s.removeLayer);
  const setBackgroundId = useDesk((s) => s.setBackgroundId);
  const pushTrace = useDesk((s) => s.pushTrace);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; dx: number; dy: number } | null>(null);
  const fondos = project.assets.filter((item) => item.kind === "fondo");
  const fondo = fondos.find((item) => item.id === asset.scene?.backgroundId) ?? fondos[0];
  const bgUrl = useResolvedSrc(activeSrc(fondo));
  const layers = asset.scene?.layers ?? [];
  const [activeId, setActiveId] = useState(layers[0]?.id ?? "");
  const active = layers.find((layer) => layer.id === activeId) ?? layers[0];

  async function save() {
    if (!bgUrl || layers.length === 0) return;
    const painted = [];
    for (const layer of layers) {
      const raw = await objectFromIdb(layer.src);
      const cut = await keyPaper(raw);
      painted.push({ src: cut, x: layer.x, y: layer.y, scale: layer.scale, flip: layer.flip });
    }
    const blob = await exportScene({ background: bgUrl, layers: painted });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${asset.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
    pushTrace({ role: "tool", tool: "exportar", text: "PNG compuesto aquí. El recorte y el encuadre no pidieron lámina.", cost: 0 });
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex gap-2 overflow-x-auto">
        {fondos.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setBackgroundId(asset.id, item.id)}
            className={`h-11 shrink-0 px-3 font-mono text-xs ${item.id === fondo?.id ? "bg-ink text-sheet" : "border border-line bg-sheet"}`}
          >
            {item.name}
          </button>
        ))}
        {fondos.length === 0 && <p className="font-mono text-xs text-muted">No hay fondo. Crea uno y sube la escena que quieras.</p>}
      </div>
      <div
        ref={frameRef}
        className="relative aspect-video w-full overflow-hidden bg-ink"
        onPointerMove={(event) => {
          if (!drag.current || !frameRef.current) return;
          const rect = frameRef.current.getBoundingClientRect();
          const x = drag.current.x + (event.clientX - drag.current.dx) / rect.width;
          const y = drag.current.y + (event.clientY - drag.current.dy) / rect.height;
          setLayer(asset.id, drag.current.id, {
            x: Math.min(0.86, Math.max(-0.2, x)),
            y: Math.min(0.85, Math.max(-0.1, y)),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        {bgUrl && <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-sheet opacity-70" style={{ top: "92%" }} />
        {layers.map((layer) => (
          <SceneSprite
            key={layer.id}
            layer={layer}
            onDown={(event) => {
              const frame = frameRef.current;
              if (!frame) return;
              frame.setPointerCapture(event.pointerId);
              drag.current = { id: layer.id, x: layer.x, y: layer.y, dx: event.clientX, dy: event.clientY };
              setActiveId(layer.id);
            }}
          />
        ))}
        {layers.length === 0 && (
          <p className="absolute inset-0 grid place-items-center font-mono text-xs text-sheet">Pon un personaje desde su mesa.</p>
        )}
      </div>
      {active && (
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
          <Field
            label={active.name}
            value={active.scale}
            min={0.25}
            max={0.9}
            step={0.01}
            onChange={(scale) => setLayer(asset.id, active.id, { scale })}
          />
          <Button onClick={() => setLayer(asset.id, active.id, { flip: !active.flip })}>
            <FlipHorizontal className="size-4" /> Voltear
          </Button>
          <Button
            onClick={() => {
              removeLayer(asset.id, active.id);
              pushTrace({ role: "tool", tool: "componer_escena", text: `${active.name} sale del plano. 0 láminas.`, cost: 0 });
            }}
          >
            Quitar
          </Button>
          <Button tone="ink" onClick={() => void save()} disabled={!bgUrl}>
            <Download className="size-4" /> Exportar PNG
          </Button>
        </div>
      )}
      <p className="mt-2 font-mono text-xs text-muted">
        El papel de la lámina se recorta en el navegador. Mover, escalar y exportar cuestan 0. La raya es el suelo.
      </p>
    </div>
  );
}

function SceneSprite({ layer, onDown }: { layer: SceneLayer; onDown: (event: PointerEvent<HTMLImageElement>) => void }) {
  const cut = useCutout(layer.src);
  if (!cut) return null;
  return (
    <img
      src={cut}
      alt={layer.name}
      style={{
        left: `${layer.x * 100}%`,
        top: `${layer.y * 100}%`,
        height: `${layer.scale * 100}%`,
        transform: layer.flip ? "scaleX(-1)" : undefined,
      }}
      className="absolute w-auto cursor-grab touch-none"
      onPointerDown={onDown}
    />
  );
}

function Director({ keys }: { keys: { deepseek: string; image: string } }) {
  const project = useDesk((s) => s.project);
  const pushTrace = useDesk((s) => s.pushTrace);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const asset = selectedAsset(project);
  const src = activeSrc(asset);
  const url = useResolvedSrc(src);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [project.trace.length]);

  async function send() {
    const brief = text.trim();
    if (!brief || busy) return;
    setText("");
    setBusy(true);
    pushTrace({ role: "user", text: brief });
    try {
      if (!keys.deepseek) {
        await runLocal(brief, asset, keys.image);
        return;
      }
      const imageDataUrl = url ? await shrinkSrc(url, 640) : undefined;
      const history = project.trace
        .filter((item) => item.role === "user" || item.role === "director")
        .slice(-6)
        .map((item) => ({ role: item.role === "director" ? ("assistant" as const) : ("user" as const), content: item.text }));
      const result = await dirigir({
        data: {
          apiKey: keys.deepseek,
          brief: `${brief}\n\nAbierto: ${asset?.name ?? "nada"} (${asset?.kind ?? ""}). Vestuario: ${asset?.spec.costume ?? ""}.`,
          history,
          imageDataUrl,
        },
      });
      if (!result.ok) {
        pushTrace({ role: "director", text: result.error });
        return;
      }
      if (result.text) pushTrace({ role: "director", text: result.text });
      for (const call of result.calls) {
        await runCall(call.name, call.args, asset, keys.image);
      }
      if (!result.text && result.calls.length === 0) {
        pushTrace({ role: "director", text: "No llamé ninguna herramienta." });
      }
    } catch (err) {
      pushTrace({ role: "director", text: err instanceof Error ? err.message : "El director se cortó." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-line md:border-l">
      <p className="px-3 py-3 font-mono text-xs tracking-widest text-muted uppercase">
        {keys.deepseek ? "Director · DeepSeek" : "Director · sin clave"}
      </p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {project.trace.map((item) => (
          <p key={item.id} className={`font-mono text-xs text-pretty ${item.role === "user" ? "text-ink" : "text-muted"}`}>
            {item.role === "tool" ? `herramienta ${item.tool}${item.cost ? ` · ${item.cost} lámina` : " · 0"} — ` : item.role === "user" ? "tú — " : ""}
            {item.text}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={keys.deepseek ? "Pide una vista o mueve la escena" : "perfil, expresión, paleta, escena"}
          className="h-11 min-w-0 flex-1 border border-line bg-sheet px-2 font-mono text-xs text-ink"
        />
        <Button tone="ink" type="submit" disabled={busy} aria-label="Enviar">
          <Send className="size-4" />
        </Button>
      </form>
    </aside>
  );
}

async function runLocal(brief: string, asset: Asset | undefined, imageKey: string) {
  const pushTrace = useDesk.getState().pushTrace;
  const text = brief.toLowerCase();
  if (!asset) return;
  if (text.includes("paleta")) {
    const src = activeSrc(asset);
    if (!src) return;
    const url = src.startsWith("idb:") ? "" : src;
    const resolved = url || (await objectFromIdb(src));
    const palette = await extractPalette(resolved);
    useDesk.getState().patchSpec(asset.id, { palette });
    pushTrace({ role: "tool", tool: "paleta", text: palette.join(" "), cost: 0 });
    return;
  }
  if (text.includes("escena") || text.includes("mueve") || text.includes("coloca")) {
    const scene = useDesk.getState().project.assets.find((item) => item.kind === "escena");
    if (scene) useDesk.getState().select(scene.id);
    pushTrace({ role: "tool", tool: "componer_escena", text: "Abrí la escena. Arrastra. Cuesta 0.", cost: 0 });
    return;
  }
  const view = text.includes("expres")
    ? "expresion"
    : text.includes("perfil")
      ? "perfil"
      : text.includes("espalda")
        ? "espalda"
        : text.includes("tres")
          ? "tres_cuartos"
          : text.includes("frente")
            ? "frente"
            : text.includes("fondo")
              ? "fondo"
              : null;
  if (!view) {
    pushTrace({
      role: "director",
      text: "Sin clave de DeepSeek solo obedezco órdenes cortas: perfil, expresión, frente, fondo, paleta, escena. Pégala en Ajustes para hablar.",
    });
    return;
  }
  await mintPlate(asset, view, imageKey);
}

async function runCall(name: string, args: CallArgs, asset: Asset | undefined, imageKey: string) {
  const desk = useDesk.getState();
  if (!asset) return;
  if (name === "ficha") {
    desk.patchSpec(asset.id, {
      costume: args.costume || asset.spec.costume,
      role: args.role || asset.spec.role,
      notes: args.notes || asset.spec.notes,
      never: args.never.length > 0 ? args.never : asset.spec.never,
    });
    desk.pushTrace({ role: "tool", tool: "ficha", text: "Ficha actualizada. 0 láminas.", cost: 0 });
    return;
  }
  if (name === "paleta") {
    await runLocal("paleta", asset, imageKey);
    return;
  }
  if (name === "componer_escena") {
    const scene = desk.project.assets.find((item) => item.kind === "escena");
    const layer = scene?.scene?.layers[0];
    if (scene && layer) {
      const x = args.x ?? layer.x;
      const y = args.y ?? layer.y;
      const scale = args.scale ?? layer.scale;
      desk.setLayer(scene.id, layer.id, { x, y, scale });
      desk.select(scene.id);
      desk.pushTrace({ role: "tool", tool: "componer_escena", text: `Posición ${x.toFixed(2)}, ${y.toFixed(2)}. 0 láminas.`, cost: 0 });
    }
    return;
  }
  if (name === "generar_lamina") {
    const allowed: ViewName[] = ["frente", "perfil", "tres_cuartos", "espalda", "expresion", "fondo", "prop", "boceto"];
    const view = allowed.find((item) => item === args.view) ?? "perfil";
    await mintPlate(asset, view, imageKey, args.prompt || undefined);
  }
}

async function objectFromIdb(src: string): Promise<string> {
  if (!src.startsWith("idb:")) return src;
  const blob = await getBlob(src.slice(4));
  if (!blob) throw new Error("La lámina no está en este navegador");
  return URL.createObjectURL(blob);
}

async function mintPlate(asset: Asset, view: ViewName, imageKey: string, prompt?: string) {
  const desk = useDesk.getState();
  const target =
    view === "fondo"
      ? (desk.project.assets.find((item) => item.kind === "fondo") ?? asset)
      : asset.kind === "personaje" || asset.kind === "prop"
        ? asset
        : (desk.project.assets.find((item) => item.kind === "personaje") ?? asset);
  const current = activeSrc(target);
  let reference: string | undefined;
  if (current) {
    const raw = await objectFromIdb(current);
    reference = await shrinkSrc(raw, 768);
    if (current.startsWith("idb:")) URL.revokeObjectURL(raw);
  }
  const costume = target.spec.costume || asset.spec.costume;
  const text =
    prompt ||
    (view === "fondo"
      ? `Fondo de animación, lugar ${target.name}. ${target.spec.notes}. Sin personas, sin texto.`
      : `El mismo personaje. ${costume}. Vista ${VIEW_LABEL[view]}. No cambies la ropa ni la paleta. Cuerpo entero salvo que la vista sea expresión.`);
  const result = await generarLamina({ data: { prompt: text, view, reference, imageKey } });
  if (!result.ok) {
    desk.pushTrace({ role: "director", text: result.error });
    throw new Error(result.error);
  }
  const id = nid();
  await putBlob(id, dataUrlToBlob(result.dataUrl));
  desk.addTake(target.id, {
    id: `${view}-${id}`,
    view,
    label: VIEW_LABEL[view] ?? view,
    src: `idb:${id}`,
    locked: false,
    cost: 1,
    prompt: text,
  });
  desk.spendPlate();
  desk.pushTrace({
    role: "tool",
    tool: "generar_lamina",
    text: `${VIEW_LABEL[view]} de ${target.name}. Una lámina, no el corto entero.`,
    cost: 1,
  });
}
