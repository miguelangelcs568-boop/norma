import { Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/desk/controls";
import type { DeskKeys } from "@/lib/desk/keys";
import type { Theme } from "@/lib/desk/prefs";

export function SettingsPanel({
  keys,
  theme,
  onTheme,
  onChange,
  onSave,
  onClose,
}: {
  keys: DeskKeys;
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onChange: (keys: DeskKeys) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]">
      <button type="button" className="absolute inset-0 bg-ink/25 backdrop-blur-sm" aria-label="Cerrar ajustes" onClick={onClose} />
      <form
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-sheet shadow-[var(--shadow-sheet)]"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">NORMA</p>
            <h2 className="text-[18px] font-semibold tracking-tight">Ajustes</h2>
          </div>
          <Button onClick={onClose} aria-label="Cerrar">
            <X className="size-3.5" />
          </Button>
        </div>
        <div className="space-y-6 px-5 py-5">
          <section>
            <p className="mb-2 text-[12px] font-medium text-muted">Apariencia</p>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-fill p-1">
              <button
                type="button"
                onClick={() => onTheme("light")}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-medium ${theme === "light" ? "bg-sheet text-ink shadow-sm" : "text-muted"}`}
              >
                <Sun className="size-3.5" /> Claro
              </button>
              <button
                type="button"
                onClick={() => onTheme("dark")}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-medium ${theme === "dark" ? "bg-sheet text-ink shadow-sm" : "text-muted"}`}
              >
                <Moon className="size-3.5" /> Oscuro
              </button>
            </div>
          </section>
          <section className="grid gap-3">
            <p className="text-[12px] font-medium text-muted">Pincel</p>
            {(
              [
                ["off", "Apagado", "Subir boceto o derivar. Calidad que controlas."],
                ["trial", "Prueba gratis", "Rápida y fea. No la uses si ya hay cara."],
                ["xai", "xAI", "Solo si pegaste clave. Sigue sin ser el eje."],
              ] as const
            ).map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ ...keys, brush: id })}
                className={`rounded-2xl border px-3 py-2.5 text-left ${keys.brush === id ? "border-ink bg-fill" : "border-line"}`}
              >
                <span className="block text-[13px] font-medium text-ink">{label}</span>
                <span className="block text-[12px] text-muted">{hint}</span>
              </button>
            ))}
          </section>
          <section className="grid gap-4">
            <p className="text-[12px] font-medium text-muted">Claves</p>
            <label className="block text-[12px] text-muted">
              DeepSeek · director (opcional)
              <input
                type="password"
                value={keys.deepseek}
                autoComplete="off"
                onChange={(event) => onChange({ ...keys, deepseek: event.target.value })}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-vellum px-3 text-[14px] text-ink outline-none focus:border-accent"
                placeholder="sk-..."
              />
            </label>
            <label className="block text-[12px] text-muted">
              xAI · solo si el pincel es xAI
              <input
                type="password"
                value={keys.image}
                autoComplete="off"
                onChange={(event) => onChange({ ...keys, image: event.target.value })}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-vellum px-3 text-[14px] text-ink outline-none focus:border-accent"
                placeholder="vacío = no usa xAI"
              />
            </label>
            <p className="text-[11px] leading-relaxed text-muted">
              DeepSeek no pinta. Sin él el chat local sigue. El corto se guarda solo en este navegador y con Guardar en el PC.
            </p>
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button tone="ink" type="submit">
            Guardar
          </Button>
        </div>
      </form>
    </div>
  );
}
