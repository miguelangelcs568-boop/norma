import { useEffect, useRef, useState, type ReactNode } from "react";
import { FilePlus, FolderOpen, HardDrive, MessageSquare, Moon, Settings, Sun } from "lucide-react";
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
  const newBlank = useDesk((s) => s.newBlank);
  const resetDemo = useDesk((s) => s.resetDemo);
  const setTitle = useDesk((s) => s.setTitle);
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
  const [talkId, setTalkId] = useState("general");
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
    setTalkId(next.id);
    if (next.kind === "escena") select(next.id);
  }

  function openDrawer(kind: DrawerKind | null) {
    setDrawer(kind);
    if (!kind) return;
    const first = project.assets.find((item) => item.id === drawerId && item.kind === kind) ?? project.assets.find((item) => item.kind === kind);
    if (first) {
      setDrawerId(first.id);
      setTalkId(first.id);
    }
  }

  async function startBlank() {
    const current = useDesk.getState().project;
    const dirty = current.assets.length > 0 || (current.title && current.title !== "Sin título");
    if (dirty) {
      const saveFirst = window.confirm("¿Guardar el corto actual en el PC antes de abrir uno vacío?");
      if (saveFirst) await packProject(current).then(downloadPack);
      const ok = window.confirm("La mesa queda sin láminas ni personajes. Punta Palma sigue en Abrir y en Ajustes. ¿Abrir vacío?");
      if (!ok) return;
    }
    newBlank();
    setTalkId("general");
    setDrawer(null);
    setDrawerId(null);
  }

  function restoreDemo() {
    const ok = window.confirm("¿Volver al corto de muestra La sal de Punta Palma? Lo de ahora se puede guardar antes con el disco.");
    if (!ok) return;
    resetDemo();
    setTalkId("general");
    setDrawer(null);
  }

  if (!ready) {
    return <div className="grid h-dvh place-items-center bg-vellum text-[15px] text-muted">Abriendo…</div>;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-vellum text-ink">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-sheet/80 px-3 backdrop-blur">
        <input
          value={project.title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Título del corto"
          className="min-w-0 flex-1 truncate bg-transparent text-[15px] font-semibold tracking-tight text-ink outline-none"
        />
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
          <IconBtn label="Proyecto nuevo" onClick={() => void startBlank()}>
            <FilePlus className="size-4" strokeWidth={1.6} />
          </IconBtn>
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
          onBlank={() => {
            setSettings(false);
            void startBlank();
          }}
          onDemo={() => {
            setSettings(false);
            restoreDemo();
          }}
          onSave={() => {
            saveKeys(keys);
            savePrefs({ theme });
            setSettings(false);
          }}
        />
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Dock open={drawer} chatOpen={chatOpen} onOpen={openDrawer} onChat={() => setChatOpen((value) => !value)} />
        {drawer && <SidePanel kind={drawer} keys={keys} pickedId={drawerId} onPick={pick} onClose={() => setDrawer(null)} />}
        <main className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${chatOpen ? "max-md:hidden" : "flex"} md:flex`}>
          {viewer ? (
            <Stage asset={viewer} keys={keys} />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 items-center justify-center bg-well p-6">
                <div className="relative aspect-video w-full max-h-full max-w-[min(100%,calc(100dvh-8rem))] overflow-hidden rounded-sm bg-black shadow-sheet">
                  <p className="absolute inset-0 grid place-items-center px-8 text-center text-[14px] leading-relaxed text-white/55">
                    Mesa vacía. En el chat dile el título y el primer personaje. Nada se pinta hasta que lo pidas.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
        {chatOpen && (
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col border-l border-line md:w-[var(--space-chat)] md:shrink-0">
            <Director keys={keys} hub roomId={talkId} onRoom={setTalkId} />
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
  children: ReactNode;
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
