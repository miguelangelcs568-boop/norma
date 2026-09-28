import { useEffect, useState } from "react";
import { PersonStanding } from "lucide-react";
import { objectFromIdb } from "@/components/desk/engine";
import { Button } from "@/components/desk/controls";
import { exportScene, keyPaper, shrinkSrc } from "@/lib/desk/images";
import { loadKeys } from "@/lib/desk/keys";
import { activeSrc, useDesk } from "@/lib/desk/store";
import { generarClip } from "@/lib/desk/video.functions";
import { onWalkRequest } from "@/lib/desk/walk-bus";

let setBusyFn: ((value: boolean) => void) | null = null;
let setClipFn: ((url: string | null) => void) | null = null;

const WALK_PROMPT =
  "2D hand-drawn anime, locked camera. The same woman already in the first frame walks from left to right across the ground. Natural walk cycle: heels, knees, swinging arms. Same face, same clothes, same place. No extra people, no text, no morphing into another person.";

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se leyó el plano"));
    reader.readAsDataURL(blob);
  });
}

export async function runAndar() {
  const desk = useDesk.getState();
  const project = desk.project;
  const scene =
    project.assets.find((item) => item.kind === "escena" && item.id === project.selectedId) ??
    project.assets.find((item) => item.kind === "escena");
  const fondo = project.assets.find((item) => item.id === scene?.scene?.backgroundId) ?? project.assets.find((item) => item.kind === "fondo");
  const layer = scene?.scene?.layers[0];
  const bgSrc = activeSrc(fondo);
  if (!scene || !fondo || !layer || !bgSrc) {
    desk.pushTrace({ role: "director", text: "No hay plano que animar." });
    return;
  }
  setBusyFn?.(true);
  desk.pushTrace({ role: "director", text: "Animando el plano 4 s. No recorto a Lina. Espera." });
  try {
    const bg = await objectFromIdb(bgSrc);
    const raw = await objectFromIdb(layer.src);
    const cut = await keyPaper(raw);
    const still = await exportScene({
      background: bg,
      layers: [{ src: cut, x: layer.x, y: layer.y, scale: layer.scale, flip: layer.flip }],
      width: 1280,
    });
    const frame = await shrinkSrc(await blobToDataUrl(still), 1024);
    const keys = loadKeys();
    const result = await generarClip({
      data: {
        prompt: WALK_PROMPT,
        image: frame,
        imageKey: keys.image,
        seconds: 4,
      },
    });
    if (!result.ok) {
      desk.pushTrace({ role: "director", text: result.error });
      return;
    }
    setClipFn?.(result.url);
    desk.spendPlate();
    desk.pushTrace({ role: "tool", tool: "andar", text: "Clip de 4 s. Un maestro de movimiento.", cost: 1 });
  } catch (err) {
    desk.pushTrace({ role: "director", text: err instanceof Error ? err.message : "No se pudo animar." });
  } finally {
    setBusyFn?.(false);
  }
}

export function WalkCanvas() {
  const [clip, setClip] = useState<string | null>(null);
  useEffect(() => {
    setClipFn = setClip;
    return () => {
      setClipFn = null;
    };
  }, []);
  if (!clip) return null;
  return <video src={clip} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />;
}

export function WalkButton() {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setBusyFn = setBusy;
    return onWalkRequest(() => void runAndar());
  }, []);
  return (
    <Button tone="ink" disabled={busy} onClick={() => void runAndar()}>
      <PersonStanding className="size-3.5" />
      {busy ? "Animando…" : "Andar"}
    </Button>
  );
}
