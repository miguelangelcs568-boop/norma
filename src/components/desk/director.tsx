import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { isShortOrder, runCall, runInterpreted } from "@/components/desk/engine";
import { useResolvedSrc } from "@/components/desk/media";
import { directorPacket, interpret } from "@/lib/desk/brief";
import { dirigir } from "@/lib/desk/deepseek.functions";
import { shrinkSrc } from "@/lib/desk/images";
import type { DeskKeys } from "@/lib/desk/keys";
import { pushGeneral } from "@/lib/desk/log";
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

export function Director({
  keys,
  scope = "asset",
  assetId,
}: {
  keys: DeskKeys;
  scope?: "general" | "asset";
  assetId?: string;
}) {
  const project = useDesk((s) => s.project);
  const lastBrief = useDesk((s) => s.lastBrief);
  const pushTrace = useDesk((s) => s.pushTrace);
  const setLastBrief = useDesk((s) => s.setLastBrief);
  const select = useDesk((s) => s.select);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const asset =
    scope === "general"
      ? selectedAsset(project)
      : project.assets.find((item) => item.id === assetId) ?? selectedAsset(project);
  const room = scope === "general" ? (project.trace ?? []) : roomOf(project, asset);
  const url = useResolvedSrc(activeSrc(asset));
  const context =
    scope === "general"
      ? "Hablas al corto. Los cajones trabajan. El visor muestra el plano."
      : asset
        ? briefFor(asset)
        : "Abre un activo.";
  const live = text.trim() ? interpret(text, asset, project) : lastBrief;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [room.length, asset?.id, scope]);

  async function send() {
    const said = text.trim();
    if (!said || busy) return;
    setText("");
    setBusy(true);
    const cooked = interpret(said, asset, project);
    setLastBrief(cooked);
    if (scope === "general") pushGeneral({ role: "user", text: said });
    else {
      if (asset) select(asset.id);
      pushTrace({ role: "user", text: said });
    }
    try {
      const target = scope === "asset" && asset ? asset : selectedAsset(useDesk.getState().project);
      const localFirst =
        !keys.deepseek ||
        isShortOrder(said) ||
        cooked.intent === "nuevo_personaje" ||
        cooked.intent === "nuevo_fondo" ||
        cooked.intent === "vista" ||
        cooked.intent === "fondo" ||
        cooked.intent === "escena" ||
        cooked.intent === "partitura" ||
        cooked.intent === "nuevo_plano" ||
        cooked.intent === "paleta" ||
        cooked.intent === "ficha";
      if (localFirst) {
        await runInterpreted(said, target, keys);
        if (scope === "general") pushGeneral({ role: "director", text: cooked.spoken });
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
          brief: directorPacket(cooked, target, project),
          history,
          imageDataUrl,
        },
      });
      if (!result.ok) {
        if (scope === "general") pushGeneral({ role: "director", text: result.error });
        else pushTrace({ role: "director", text: result.error });
        return;
      }
      if (result.text) {
        if (scope === "general") pushGeneral({ role: "director", text: result.text });
        else pushTrace({ role: "director", text: result.text });
      }
      for (const call of result.calls) {
        await runCall(call.name, call.args, selectedAsset(useDesk.getState().project), keys);
      }
      if (!result.text && result.calls.length === 0) {
        await runInterpreted(said, selectedAsset(useDesk.getState().project), keys);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "El director se cortó.";
      if (scope === "general") pushGeneral({ role: "director", text: msg });
      else pushTrace({ role: "director", text: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-line bg-sheet/70">
      <header className="shrink-0 border-b border-line px-4 py-3">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
          {scope === "general" ? "Chat del corto" : `Chat de ${asset?.name ?? "estudio"}`}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink">{context}</p>
      </header>
      {live && (
        <div className="shrink-0 border-b border-line px-4 py-3">
          <p className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">{PRESS[live.press] ?? live.press}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink">{live.spoken || (scope === "general" ? "Una frase al corto basta." : "Este chat es de este activo.")}</p>
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
        className="shrink-0 border-t border-line p-3"
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
            placeholder={busy ? "Trabajando…" : scope === "general" ? "al corto…" : `en ${asset?.name ?? "el estudio"}…`}
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
