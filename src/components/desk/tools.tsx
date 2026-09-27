import { useRef } from "react";
import { Lock, Palette, Upload } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { useResolvedSrc } from "@/components/desk/media";
import { putBlob } from "@/lib/desk/idb";
import { dataUrlToBlob, extractPalette, shrinkSrc } from "@/lib/desk/images";
import { activeSrc, nid, useDesk } from "@/lib/desk/store";
import { VIEW_LABEL, type Asset, type Take, type ViewName } from "@/lib/desk/types";

export function ToolRow({
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
    <div className="max-h-[28vh] shrink-0 overflow-y-auto border-t border-line bg-sheet/70 p-2">
      <div className="flex flex-wrap gap-1.5">
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
            En escena
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
