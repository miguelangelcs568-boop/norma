import { useEffect, useRef, useState, type ReactNode } from "react";
import { FolderOpen, HardDrive, LayoutGrid, MessageSquare, Moon, Settings, Sun } from "lucide-react";
import { Director } from "@/components/desk/director";
import { Dock, SidePanel, type DrawerKind } from "@/components/desk/drawers";
import { ProjectsPanel } from "@/components/desk/ProjectsPanel";
import { SettingsPanel } from "@/components/desk/SettingsPanel";
import { Stage } from "@/components/desk/stage";
import { loadKeys, saveKeys, type DeskKeys } from "@/lib/desk/keys";
import {
  addBlank,
  addDemo,
  bootShelf,
  dropFromShelf,
  openOnShelf,
  remember,
  type Shelf,
} from "@/lib/desk/library";
import { downloadPack, packProject, readPackFile } from "@/lib/desk/pack";
import { applyTheme, loadPrefs, savePrefs, type Theme } from "@/lib/desk/prefs";
import { useDesk } from "@/lib/desk/store";
import type { Asset } from "@/lib/desk/types";

export function Desk() {
  const project = useDesk((s) => s.project);
  const select = useDesk((s) => s.select);
  const loadProject = useDesk((s) => s.loadProject);
  const setTitle = useDesk((s) => s.setTitle);
  const viewer =
    project.assets.find((item) => item.kind === "escena" && item.id === project.selectedId) ??
    project.assets.find((item) => item.kind === "escena") ??
    project.assets[0];
  const [settings, setSettings] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [shelf, setShelf] = useState<Shelf | null>(null);
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
      setShelf(bootShelf(desk.project));
      setReady(true);
    });
    setKeys(loadKeys());
    const prefs = loadPrefs();
    setTheme(prefs.theme);
    applyTheme(prefs.theme);
  }, []);

  useEffect(() => {
    if (!ready || !shelf) return;
    const timer = window.setTimeout(() => setShelf(remember(shelf, useDesk.getState().project)), 800);
    return () => window.clearTimeout(timer);
  }, [project, ready, shelf?.currentId]);

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

  function sit(next: { shelf: Shelf; project: typeof project }) {
    setShelf(next.shelf);
    loadProject(next.project);
    setTalkId("general");
    setDrawer(null);
    setDrawerId(null);
    setProjectsOpen(false);
  }

  function goNew() {
    if (!shelf) return;
    sit(addBlank(shelf, useDesk.getState().project));
  }

  function goOpen(id: string) {
    if (!shelf) return;
    const next = openOnShelf(shelf, id, useDesk.getState().project);
    if (next) sit(next);
  }

  function goDemo() {
    if (!shelf) return;
    sit(addDemo(shelf, useDesk.getState().project));
  }

  function goDrop(id: string) {
    if (!shelf) return;
    const next = dropFromShelf(shelf, id);
    setShelf(next);
    if (next.currentId !== shelf.currentId) {
      const item = next.items.find((entry) => entry.id === next.currentId);
      if (item) {
        loadProject(item.project);
        setTalkId("general");
      }
    }
  }

  if (!ready) {
    return <div className="grid h-dvh place-items-center bg-vellum text-[15px] text-muted">Abriendo…</div>;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-vellum text-ink">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-sheet/80 px-3 backdrop-blur">
        <button type="button" onClick={() => setProjectsOpen(true)} className="flex min-w-0 items-center gap-2 text-left">
          <LayoutGrid className="size-4 shrink-0 text-muted" strokeWidth={1.6} />
          <input
            value={project.title}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Título del corto"
            className="min-w-0 flex-1 truncate bg-transparent text-[15px] font-semibold tracking-tight text-ink outline-none"
          />
        </button>
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
          <IconBtn label="Proyectos" pressed={projectsOpen} onClick={() => setProjectsOpen(true)}>
            <LayoutGrid className="size-4" strokeWidth={1.6} />
          </IconBtn>
          <IconBtn label="Guardar" onClick={() => void packProject(project).then(downloadPack)}>
            <HardDrive className="size-4" strokeWidth={1.6} />
          </IconBtn>
          <IconBtn label="Abrir archivo" onClick={() => fileRef.current?.click()}>
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
      {projectsOpen && shelf && (
        <ProjectsPanel
          shelf={shelf}
          onOpen={goOpen}
          onNew={goNew}
          onDemo={goDemo}
          onDrop={goDrop}
          onClose={() => setProjectsOpen(false)}
        />
      )}
      {settings && (
        <SettingsPanel
          keys={keys}
          theme={theme}
          onTheme={chooseTheme}
          onChange={setKeys}
          onClose={() => setSettings(false)}
          onBlank={() => {
            setSettings(false);
            setProjectsOpen(true);
          }}
          onDemo={() => {
            setSettings(false);
            goDemo();
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
                    Proyecto vacío. En el chat pide un personaje o un lugar. NORMA pinta la primera lámina.
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
