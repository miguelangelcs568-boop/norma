import { useEffect, useState } from "react";
import { Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { Director } from "@/components/desk/director";
import { SettingsPanel } from "@/components/desk/SettingsPanel";
import { Stage } from "@/components/desk/stage";
import { Tree } from "@/components/desk/tree";
import { loadKeys, saveKeys, type DeskKeys } from "@/lib/desk/keys";
import { applyTheme, loadPrefs, savePrefs, type Theme } from "@/lib/desk/prefs";
import { selectedAsset, useDesk } from "@/lib/desk/store";

export function Desk() {
  const project = useDesk((s) => s.project);
  const pane = useDesk((s) => s.pane);
  const lastBrief = useDesk((s) => s.lastBrief);
  const asset = selectedAsset(project);
  const [settings, setSettings] = useState(false);
  const [keys, setKeys] = useState<DeskKeys>({ deepseek: "", image: "", brush: "off" });
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void useDesk.persist.rehydrate().then(() => {
      const desk = useDesk.getState();
      desk.loadProject(desk.project);
      setReady(true);
    });
    setKeys(loadKeys());
    const prefs = loadPrefs();
    setTheme(prefs.theme);
    applyTheme(prefs.theme);
  }, []);

  function chooseTheme(next: Theme) {
    setTheme(next);
    savePrefs({ theme: next });
  }

  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center bg-vellum text-[13px] text-muted">Abriendo el corto…</div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-vellum text-ink">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-sheet px-4 py-2.5 md:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">NORMA</p>
          <h1 className="truncate font-sans text-[20px] font-semibold leading-tight tracking-tight">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {lastBrief && (
            <p className="hidden max-w-[14rem] truncate rounded-full bg-fill px-3 py-1 text-[11px] text-muted sm:block">
              {lastBrief.press === "pintar" ? "Pincel" : lastBrief.press === "derivar" ? "Deriva" : lastBrief.press === "reusar" ? "Canon" : "Mesa"}
            </p>
          )}
          <p className="hidden text-[12px] text-muted tabular-nums sm:block">
            Maestros <span className="font-medium text-ink">{project.platesSpent}</span>
          </p>
          <Button onClick={() => chooseTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Tema claro" : "Tema oscuro"}>
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </Button>
          <Button onClick={() => setSettings(true)} aria-label="Ajustes">
            <Settings className="size-3.5" />
          </Button>
        </div>
      </header>
      {settings && (
        <SettingsPanel
          keys={keys}
          theme={theme}
          onTheme={chooseTheme}
          onChange={setKeys}
          onClose={() => setSettings(false)}
          onSave={() => {
            saveKeys(keys);
            savePrefs({ theme });
            setSettings(false);
          }}
        />
      )}
      <div className="flex shrink-0 gap-1 border-b border-line p-2 md:hidden">
        <PaneButton current={pane} id="archivo" label="Archivo" />
        <PaneButton current={pane} id="mesa" label="Mesa" />
        <PaneButton current={pane} id="director" label="Orden" />
      </div>
      <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[15rem_minmax(0,1fr)_22rem]">
        <div className={`${pane === "archivo" ? "flex" : "hidden md:flex"} h-full min-h-0 flex-col overflow-hidden`}>
          <Tree />
        </div>
        <main className={`${pane === "mesa" ? "flex" : "hidden md:flex"} h-full min-h-0 flex-col overflow-hidden`}>
          {asset ? <Stage asset={asset} keys={keys} /> : null}
        </main>
        <div className={`${pane === "director" ? "flex" : "hidden md:flex"} h-full min-h-0 flex-col overflow-hidden`}>
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
      className={`h-9 flex-1 rounded-xl text-[13px] font-medium ${current === id ? "bg-ink text-sheet" : "border border-line bg-sheet text-ink"}`}
    >
      {label}
    </button>
  );
}
