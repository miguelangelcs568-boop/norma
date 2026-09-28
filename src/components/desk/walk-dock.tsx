import { useEffect, useRef, useState } from "react";
import { PersonStanding } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { onWalkRequest } from "@/lib/desk/walk-bus";
import { playWalk } from "@/lib/desk/walk";
import { useDesk } from "@/lib/desk/store";

const canvasRefGlobal = { current: null as HTMLCanvasElement | null };
const stopRef = { current: false };
let setBusyFn: ((v: boolean) => void) | null = null;

export async function runAndar() {
  const canvas = canvasRefGlobal.current;
  const project = useDesk.getState().project;
  const pushTrace = useDesk.getState().pushTrace;
  if (!canvas) {
    pushTrace({ role: "director", text: "Abre el plano para verla andar." });
    return;
  }
  stopRef.current = false;
  setBusyFn?.(true);
  canvas.width = 1280;
  canvas.height = 720;
  canvas.style.opacity = "1";
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    setBusyFn?.(false);
    return;
  }
  pushTrace({ role: "tool", tool: "andar", text: "Andar 3 s. Cara de la lámina, piernas articuladas. 0 láminas.", cost: 0 });
  try {
    await playWalk(ctx, project, { seconds: 2.8, stopped: () => stopRef.current });
  } catch (err) {
    pushTrace({ role: "director", text: err instanceof Error ? err.message : "No pudo andar." });
  } finally {
    setBusyFn?.(false);
  }
}

export function WalkCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    canvasRefGlobal.current = ref.current;
    return () => {
      canvasRefGlobal.current = null;
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0 }} />;
}

export function WalkButton() {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setBusyFn = setBusy;
    return onWalkRequest(() => void runAndar());
  }, []);
  return (
    <Button
      tone="ink"
      onClick={() => {
        if (busy) stopRef.current = true;
        else void runAndar();
      }}
    >
      <PersonStanding className="size-3.5" />
      {busy ? "Parar" : "Andar"}
    </Button>
  );
}
