import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { isShortOrder, runCall, runInterpreted } from "@/components/desk/engine";
import { useResolvedSrc } from "@/components/desk/media";
import { directorPacket, interpret } from "@/lib/desk/brief";
import { dirigir } from "@/lib/desk/deepseek.functions";
import { shrinkSrc } from "@/lib/desk/images";
import type { DeskKeys } from "@/lib/desk/keys";
import { activeSrc, selectedAsset, useDesk } from "@/lib/desk/store";
import { briefFor, roomOf } from "@/lib/desk/types";

const PRESS: Record<string, string> = {
  reusar: "Reusa",
  derivar: "Deriva",
  pintar: "Pinta maestro",
  componer: "Compone",
  ficha: "Ficha",
  nada: "Espera",
};

export function Director({ keys }: { keys: DeskKeys }) {
  const project = useDesk((s) => s.project);
  const lastBrief = useDesk((s) => s.lastBrief);
  const pushTrace = useDesk((s) => s.pushTrace);
  const setLastBrief = useDesk((s) => s.setLastBrief);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const asset = selectedAsset(project);
  const room = roomOf(project, asset);
  const url = useResolvedSrc(activeSrc(asset));
  const context = asset ? briefFor(asset) : "Abre un personaje, un fondo o una escena.";
  const live = text.trim() ? interpret(text, asset, project) : lastBrief;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [room.length, asset?.id]);

  async function send() {
    const said = text.trim();
    if (!said || busy) return;
    setText("");
    setBusy(true);
    const cooked = interpret(said, asset, project);
    setLastBrief(cooked);
    pushTrace({ role: "user", text: said });
    try {
      const localFirst =
        !keys.deepseek ||
        isShortOrder(said) ||
        cooked.intent === "nuevo_personaje" ||
        cooked.intent === "nuevo_fondo" ||
        cooked.intent === "vista" ||
        cooked.intent === "fondo" ||
        cooked.intent === "escena" ||
        cooked.intent === "paleta" ||
        cooked.intent === "ficha";
      if (localFirst) {
        await runInterpreted(said, asset, keys);
        return;
      }
      const imageDataUrl = url ? await shrinkSrc(url, 640) : undefined;
      const history = room
        .filter((item) => item.role === "user" || item.role === "director")
        .slice(-8)
        .map((item) => ({ role: item.role === "director" ? ("assistant" as const) : ("user" as const), content: item.text }));
      const result = await dirigir({
        data: {
          apiKey: keys.deepseek,
          brief: directorPacket(cooked, asset, project),
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
        await runCall(call.name, call.args, selectedAsset(useDesk.getState().project), keys);
      }
      if (!result.text && result.calls.length === 0) {
        await runInterpreted(said, selectedAsset(useDesk.getState().project), keys);
      }
    } catch (err) {
      pushTrace({ role: "director", text: err instanceof Error ? err.message : "El director se cortó." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-sheet/70 md:border-l">
      <header className="border-b border-line px-4 py-3">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">Chat de {asset?.name ?? "estudio"}</p>
        <p className="mt-1 text-[13px] leading-snug text-ink">{context}</p>
      </header>
      {live && (
        <div className="border-b border-line px-4 py-3">
          <p className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">{PRESS[live.press] ?? live.press}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink">{live.spoken || "Escribe abajo. Este chat es de este activo."}</p>
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {room.map((item) => (
          <p
            key={item.id}
            className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
              item.role === "user" ? "bg-fill text-ink" : item.role === "tool" ? "text-[12px] text-muted" : "bg-sheet text-ink"
            }`}
          >
            {item.role === "tool" ? `${item.tool}${item.cost ? ` · ${item.cost}` : " · 0"} — ` : item.role === "user" ? "tú — " : ""}
            {item.text}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        className="border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={busy}
            placeholder={busy ? "Trabajando…" : `en ${asset?.name ?? "el estudio"}…`}
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-vellum px-3.5 text-[13px] text-ink outline-none focus:border-accent disabled:opacity-60"
          />
          <Button tone="ink" type="submit" disabled={busy} aria-label="Enviar">
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </aside>
  );
}
