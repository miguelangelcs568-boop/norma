import { useEffect, useRef, useState } from "react";
import { FolderOpen, HardDrive, MessageSquare, Moon, Settings, Sun } from "lucide-react";
import { Director } from "@/components/desk/director";
import { Dock, SidePanel, type DrawerKind } from "@/components/desk/drawers";
import { SettingsPanel } from "@/components/desk/SettingsPanel";
import { Stage } from "@/components/desk/stage";
import { loadKeys, saveKeys, type DeskKeys } from "@/lib/desk/keys";
import { downloadPack, packProject, readPackFile } from "@/lib/desk/pack";
import { applyTheme, loadPrefs, savePrefs, type Theme } from "@/lib/desk/prefs";
import { useDesk } from "@/lib/desk/store";
import type { Asset } from "@/lib/desk/types";

export function Desk() {
  const project = useDesk((s) => s.project);
  const select = useDesk((s) => s.select);
  const loadProject = useDesk((s) => s.loadProject);
  const viewer =
    project.assets.find((item) => item.kind === "escena" && item.id === project.selectedId) ??
    project.assets.find((item) => item.kind === "escena") ??
    project.assets[0];
  const [settings, setSettings] = useState(false);
  const [keys, setKeys] = useState<DeskKeys>({ deepseek: "", image: "", brush: "off" });
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState<DrawerKind | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

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
    return <div className="grid h-dvh place-items-center bg-vellum text-[15px] text-muted">Abriendo…</div>;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-vellum text-ink">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-sheet/80 px-3 backdrop-blur">
        <p className="truncate text-[15px] font-semibold tracking-tight">{project.title}</p>
        <div className="flex items-center gap-0.5">
          <input
            ref={fileRef}
            type="file"
            accept=".json,.norma.json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void readPackFile(file).then(loadProject);
            }}
          />
          <IconBtn label="Guardar" onClick={() => void packProject(project).then(downloadPack)}>
            <HardDrive className="size-4" strokeWidth={1.6} />
          </IconBtn>
          <IconBtn label="Abrir" onClick={() => fileRef.current?.click()}>
            <FolderOpen className="size-4" strokeWidth={1.6} />
          </IconBtn>
          <IconBtn label="Conversación" pressed={chatOpen} onClick={() => setChatOpen((value) => !value)}>
            <MessageSquare className="size-4" strokeWidth={1.6} />
          </IconBtn>
          <IconBtn label={theme === "dark" ? "Claro" : "Oscuro"} onClick={() => chooseTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="size-4" strokeWidth={1.6} /> : <Moon className="size-4" strokeWidth={1.6} />}
          </IconBtn>
          <IconBtn label="Ajustes" onClick={() => setSettings(true)}>
            <Settings className="size-4" strokeWidth={1.6} />
          </IconBtn>
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
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Dock open={drawer} chatOpen={chatOpen} onOpen={setDrawer} onChat={() => setChatOpen((value) => !value)} />
        {drawer && <SidePanel kind={drawer} keys={keys} pickedId={drawerId} onPick={pick} onClose={() => setDrawer(null)} />}
        <main className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${chatOpen ? "max-md:hidden" : "flex"} md:flex`}>
          {viewer ? <Stage asset={viewer} keys={keys} /> : null}
        </main>
        {chatOpen && (
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col border-l border-line md:w-[var(--space-chat)] md:shrink-0">
            <Director keys={keys} hub />
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-full ${pressed ? "bg-fill text-ink" : "text-muted hover:bg-fill hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
