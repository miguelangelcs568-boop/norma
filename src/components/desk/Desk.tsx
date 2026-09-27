import { useEffect, useState } from "react";
import { Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { Director } from "@/components/desk/director";
import { SettingsPanel } from "@/components/desk/SettingsPanel";
import { Stage } from "@/components/desk/stage";
import { Tree } from "@/components/desk/tree";
import { loadKeys, saveKeys } from "@/lib/desk/keys";
import { applyTheme, loadPrefs, savePrefs, type Theme } from "@/lib/desk/prefs";
import { selectedAsset, useDesk } from "@/lib/desk/store";

export function Desk() {
  const project = useDesk((s) => s.project);
  const pane = useDesk((s) => s.pane);
  const asset = selectedAsset(project);
  const [settings, setSettings] = useState(false);
  const [keys, setKeys] = useState({ deepseek: "", image: "" });
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    void useDesk.persist.rehydrate();
    setKeys(loadKeys());
    const prefs = loadPrefs();
    setTheme(prefs.theme);
    applyTheme(prefs.theme);
  }, []);

  function chooseTheme(next: Theme) {
    setTheme(next);
    savePrefs({ theme: next });
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-vellum text-ink">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line/80 bg-sheet/80 px-4 py-2.5 backdrop-blur-xl md:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">NORMA · escritorio de diseño</p>
          <h1 className="truncate font-sans text-[22px] font-semibold leading-tight tracking-tight">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden text-[12px] text-muted tabular-nums sm:block">
            Láminas pedidas <span className="font-medium text-ink">{project.platesSpent}</span>
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
      <div className="flex gap-1 border-b border-line p-2 md:hidden">
        <PaneButton current={pane} id="archivo" label="Archivo" />
        <PaneButton current={pane} id="mesa" label="Mesa" />
        <PaneButton current={pane} id="director" label="Director" />
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[16rem_minmax(0,1fr)_22rem]">
        <div className={pane === "archivo" ? "min-h-0" : "hidden md:block"}>
          <Tree />
        </div>
        <main className={`${pane === "mesa" ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden`}>
          {asset ? <Stage asset={asset} keys={keys} /> : null}
        </main>
        <div className={pane === "director" ? "min-h-0" : "hidden md:block"}>
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
      className={`h-9 flex-1 rounded-full text-[13px] font-medium ${current === id ? "bg-ink text-sheet" : "border border-line bg-sheet text-ink"}`}
    >
      {label}
    </button>
  );
}
