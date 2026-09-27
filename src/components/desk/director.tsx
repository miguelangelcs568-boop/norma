import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { isShortOrder, runCall, runLocal } from "@/components/desk/engine";
import { useResolvedSrc } from "@/components/desk/media";
import { dirigir } from "@/lib/desk/deepseek.functions";
import { shrinkSrc } from "@/lib/desk/images";
import { activeSrc, selectedAsset, useDesk } from "@/lib/desk/store";
import { briefFor } from "@/lib/desk/types";

export function Director({ keys }: { keys: { deepseek: string; image: string } }) {
  const project = useDesk((s) => s.project);
  const pushTrace = useDesk((s) => s.pushTrace);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const asset = selectedAsset(project);
  const url = useResolvedSrc(activeSrc(asset));
  const context = asset ? briefFor(asset) : "Abre un personaje, un fondo o una escena.";

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
      if (!keys.deepseek || isShortOrder(brief)) {
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
          brief: `${brief}\n\nAbierto: ${asset?.name ?? "nada"} (${asset?.kind ?? ""}). ${context} Vestuario: ${asset?.spec.costume ?? ""}.`,
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
      if (result.calls.length === 0 && isShortOrder(brief)) {
        await runLocal(brief, asset, keys.image);
        return;
      }
      if (!result.text && result.calls.length === 0) {
        pushTrace({ role: "director", text: "No supe qué herramienta usar. Prueba: fondo, perfil, frente." });
      }
    } catch (err) {
      pushTrace({ role: "director", text: err instanceof Error ? err.message : "El director se cortó." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-sheet/40 md:border-l">
      <header className="border-b border-line px-4 py-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">
          {keys.deepseek ? "Director · obedece" : "Director · órdenes cortas"}
        </p>
        <p className="mt-1.5 text-[13px] leading-snug text-ink">{context}</p>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {project.trace.map((item) => (
          <p
            key={item.id}
            className={`rounded-2xl px-3 py-2 text-[13px] leading-relaxed text-pretty ${
              item.role === "user" ? "bg-fill text-ink" : item.role === "tool" ? "text-[12px] text-muted" : "bg-sheet text-ink"
            }`}
          >
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
          disabled={busy}
          placeholder={busy ? "Pintando…" : "fondo · perfil · frente · o una frase"}
          className="h-10 min-w-0 flex-1 rounded-full border border-line bg-sheet px-3.5 text-[13px] text-ink outline-none focus:border-accent disabled:opacity-60"
        />
        <Button tone="ink" type="submit" disabled={busy} aria-label="Enviar">
          <Send className="size-4" />
        </Button>
      </form>
    </aside>
  );
}
