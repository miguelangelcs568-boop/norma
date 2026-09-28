import { useEffect, useState } from "react";
import { Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/desk/controls";
import { Director } from "@/components/desk/director";
import { DrawerBar, DrawerSheet, type DrawerKind } from "@/components/desk/drawers";
import { SettingsPanel } from "@/components/desk/SettingsPanel";
import { Stage } from "@/components/desk/stage";
import { loadKeys, saveKeys, type DeskKeys } from "@/lib/desk/keys";
import { applyTheme, loadPrefs, savePrefs, type Theme } from "@/lib/desk/prefs";
import { selectedAsset, useDesk } from "@/lib/desk/store";
import type { Asset } from "@/lib/desk/types";

export function Desk() {
  const project = useDesk((s) => s.project);
  const lastBrief = useDesk((s) => s.lastBrief);
  const select = useDesk((s) => s.select);
  const asset = selectedAsset(project);
  const [settings, setSettings] = useState(false);
  const [keys, setKeys] = useState<DeskKeys>({ deepseek: "", image: "", brush: "off" });
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState<DrawerKind | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

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

  function pick(next: Asset) {
    setDrawerId(next.id);
    if (next.kind === "escena") select(next.id);
  }

  if (!ready) {
    return <div className="grid h-dvh place-items-center bg-vellum text-[13px] text-muted">Abriendo el corto…</div>;
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
              {lastBrief.press === "pintar" ? "Pincel" : lastBrief.press === "componer" ? "Rollo" : "Mesa"}
            </p>
          )}
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
      <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="flex h-full min-h-0 flex-col overflow-hidden">
          {asset ? <Stage asset={asset} keys={keys} /> : <p className="p-6 text-[13px] text-muted">Abre un plano.</p>}
        </main>
        <div className="hidden h-full min-h-0 border-l border-line md:flex md:flex-col">
          <Director keys={keys} scope="general" />
        </div>
      </div>
      {drawer && (
        <DrawerSheet
          kind={drawer}
          keys={keys}
          pickedId={drawerId}
          onPick={pick}
          onClose={() => setDrawer(null)}
        />
      )}
      <DrawerBar open={drawer} onOpen={setDrawer} />
    </div>
  );
}
