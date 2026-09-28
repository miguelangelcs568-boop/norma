import { useEffect, useRef, useState } from "react";
import { PersonStanding } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { onWalkRequest } from "@/lib/desk/walk-bus";
import { playWalk } from "@/lib/desk/walk";
import { useDesk } from "@/lib/desk/store";

export function WalkDock({ frameRef }: { frameRef: React.RefObject<HTMLDivElement | null> }) {
  const project = useDesk((s) => s.project);
  const pushTrace = useDesk((s) => s.pushTrace);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef(false);
  const [busy, setBusy] = useState(false);

  async function andar() {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame || busy) return;
    stopRef.current = false;
    setBusy(true);
    canvas.width = 1280;
    canvas.height = 720;
    canvas.style.opacity = "1";
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    pushTrace({ role: "tool", tool: "andar", text: "Andar 3 s. 0 láminas.", cost: 0 });
    try {
      await playWalk(ctx, useDesk.getState().project, {
        seconds: 2.8,
        stopped: () => stopRef.current,
      });
    } catch (err) {
      pushTrace({ role: "director", text: err instanceof Error ? err.message : "No pudo andar." });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => onWalkRequest(() => void andar()), [project.title]);

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: busy ? 1 : 0 }} />
      <Button
        tone="ink"
        onClick={() => {
          if (busy) stopRef.current = true;
          else void andar();
        }}
      >
        <PersonStanding className="size-3.5" />
        {busy ? "Parar" : "Andar"}
      </Button>
    </>
  );
}
