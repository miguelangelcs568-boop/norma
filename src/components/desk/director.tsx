import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { isShortOrder, runCall, runInterpreted } from "@/components/desk/engine";
import { useResolvedSrc } from "@/components/desk/media";
import { directorPacket, interpret } from "@/lib/desk/brief";
import { dirigir } from "@/lib/desk/deepseek.functions";
import { shrinkSrc } from "@/lib/desk/images";
import type { DeskKeys } from "@/lib/desk/keys";
import { pushGeneral } from "@/lib/desk/log";
import { activeSrc, selectedAsset, useDesk } from "@/lib/desk/store";
import { roomOf } from "@/lib/desk/types";

export function Director({ keys, hub = false, assetId }: { keys: DeskKeys; hub?: boolean; assetId?: string }) {
  const project = useDesk((s) => s.project);
  const pushTrace = useDesk((s) => s.pushTrace);
  const setLastBrief = useDesk((s) => s.setLastBrief);
  const select = useDesk((s) => s.select);
  const [roomId, setRoomId] = useState(assetId ?? "general");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const rooms = [{ id: "general", name: "Corto" }, ...project.assets.map((item) => ({ id: item.id, name: item.name.split(" ")[0] ?? item.name }))];
  const current = hub ? roomId : (assetId ?? "general");
  const scope = current === "general" ? "general" : "asset";
  const asset =
    scope === "general"
      ? selectedAsset(project)
      : project.assets.find((item) => item.id === current) ?? selectedAsset(project);
  const thread = scope === "general" ? (project.trace ?? []) : roomOf(project, asset);
  const url = useResolvedSrc(activeSrc(asset));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, current]);

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
        ["nuevo_personaje", "nuevo_fondo", "vista", "fondo", "escena", "partitura", "nuevo_plano", "paleta", "ficha"].includes(cooked.intent);
      if (localFirst) {
        await runInterpreted(said, target, keys);
        if (scope === "general") pushGeneral({ role: "director", text: cooked.spoken });
        return;
      }
      const imageDataUrl = url ? await shrinkSrc(url, 640) : undefined;
      const history = thread
        .filter((item) => item.role === "user" || item.role === "director")
        .slice(-8)
        .map((item) => ({ role: item.role === "director" ? ("assistant" as const) : ("user" as const), content: item.text }));
      const result = await dirigir({
        data: { apiKey: keys.deepseek, brief: directorPacket(cooked, target, project), history, imageDataUrl },
      });
      if (!result.ok) {
        const line = { role: "director" as const, text: result.error };
        if (scope === "general") pushGeneral(line);
        else pushTrace(line);
        return;
      }
      if (result.text) {
        const line = { role: "director" as const, text: result.text };
        if (scope === "general") pushGeneral(line);
        else pushTrace(line);
      }
      for (const call of result.calls) {
        await runCall(call.name, call.args, selectedAsset(useDesk.getState().project), keys);
      }
      if (!result.text && result.calls.length === 0) {
        await runInterpreted(said, selectedAsset(useDesk.getState().project), keys);
      }
    } catch (err) {
      const line = { role: "director" as const, text: err instanceof Error ? err.message : "Se cortó." };
      if (scope === "general") pushGeneral(line);
      else pushTrace(line);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-sheet">
      {hub && (
        <div className="flex shrink-0 gap-1 overflow-x-auto px-3 pt-3 pb-1">
          {rooms.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRoomId(item.id)}
              className={`h-7 shrink-0 rounded-full px-3 text-[12px] font-medium ${item.id === current ? "bg-ink text-sheet" : "text-muted hover:text-ink"}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {thread.length === 0 && (
          <p className="pt-8 text-center text-[13px] text-muted">
            {scope === "general" ? "Dile al corto lo que tiene que pasar." : `Notas de ${asset?.name ?? "esto"}.`}
          </p>
        )}
        {thread.map((item) => {
          if (item.role === "tool") {
            return (
              <p key={item.id} className="text-center text-[11px] text-muted">
                {item.text}
              </p>
            );
          }
          const mine = item.role === "user";
          return (
            <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[85%] px-3.5 py-2 text-[15px] leading-snug ${
                  mine ? "rounded-[20px] rounded-br-md bg-ink text-sheet" : "rounded-[20px] rounded-bl-md bg-fill text-ink"
                }`}
              >
                {item.text}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form
        className="shrink-0 px-3 pb-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <div className="flex items-center gap-2 rounded-full bg-fill px-2 py-1">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={busy}
            placeholder={busy ? "…" : scope === "general" ? "Mensaje" : asset?.name}
            className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[15px] text-ink outline-none placeholder:text-muted disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Enviar"
            className="flex size-8 items-center justify-center rounded-full bg-ink text-sheet disabled:opacity-30"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </aside>
  );
}
