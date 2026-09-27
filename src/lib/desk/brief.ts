import { VIEW_LABEL, type Asset, type DeskProject, type Spec, type ViewName } from "./types";

export type Press = "reusar" | "derivar" | "pintar" | "componer" | "ficha" | "nada";

export type Brief = {
  said: string;
  intent: "vista" | "fondo" | "ficha" | "escena" | "nuevo_personaje" | "nuevo_fondo" | "paleta" | "hablar";
  view: ViewName | null;
  spoken: string;
  paint: string;
  createKind?: "personaje" | "fondo";
  createName: string;
  spec: Partial<Spec>;
  press: Press;
};

const WORLD = {
  title: "La sal de Punta Palma",
  place: "Estero del Caribe colombiano, calor humedo, sal, mangle y muelle",
  look: "Animacion 2D, linea limpia, color plano, no 3D, no foto, no catalogo",
  paper: "papel calido, cuerpo entero, margen amplio, sin texto, sin gente extra",
};

function has(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function pickView(text: string): ViewName | null {
  if (has(text, ["expres", "cara", "sonrisa", "llanto"])) return "expresion";
  if (has(text, ["tres cuartos", "3/4"])) return "tres_cuartos";
  if (has(text, ["espalda", "de espaldas"])) return "espalda";
  if (has(text, ["perfil", "de lado"])) return "perfil";
  if (has(text, ["frente", "de frente"])) return "frente";
  if (has(text, ["fondo", "paisaje", "escenario", "lugar", "muelle", "estero"])) return "fondo";
  return null;
}

function heightFrom(text: string) {
  if (has(text, ["muy alto", "gigante"])) return "192 cm, 8 cabezas y media";
  if (has(text, ["alto", "alta"])) return "185 cm, 8 cabezas, no pasarela";
  if (has(text, ["bajo", "baja"])) return "155 cm";
  return "168 cm, gente de pueblo";
}

function costumeFrom(text: string, fallback: string) {
  if (has(text, ["traje", "saco", "corbata"])) {
    return "Traje de lino oscuro de calor, chaqueta sin brillo, camisa clara usada, pantalon recto, zapatos de pueblo. No smoking.";
  }
  if (has(text, ["vestido"])) return "Vestido de algodon lavado, corte simple.";
  if (has(text, ["uniforme"])) return "Uniforme de trabajo gastado, sin insignias inventadas.";
  return fallback;
}

function lightFrom(text: string) {
  if (has(text, ["noche", "luna"])) return "Noche calida, poca luz electrica.";
  if (has(text, ["amanecer", "manana"])) return "Luz baja de manana.";
  return "Tarde, sol largo, sal en el aire.";
}

function nameFrom(text: string, kind: "personaje" | "fondo") {
  const named = text.match(/(?:llamalo|llamala|se llama|nombre)\s+([a-zà-ÿ][a-zà-ÿ\s]{1,24})/i);
  if (named) return named[1].trim();
  if (kind === "fondo") return has(text, ["muelle"]) ? "Muelle de noche" : "Lugar nuevo";
  return has(text, ["traje"]) ? "Hombre del traje" : "Personaje nuevo";
}

export function paintLock(view: ViewName | null, body: string) {
  const tail = view === "fondo" ? "Fondo 16:9, sin personas, sin texto." : WORLD.paper;
  const vista = view ? `Vista: ${VIEW_LABEL[view]}.` : "";
  return [WORLD.look, body, tail, vista].filter(Boolean).join(" ");
}

export function interpret(said: string, asset: Asset | undefined, project?: DeskProject): Brief {
  const text = said.trim().toLowerCase();
  const empty: Brief = { said, intent: "hablar", view: null, spoken: "", paint: "", createName: "", spec: {}, press: "nada" };
  if (!text) return { ...empty, spoken: "Escribe que quieres. Una frase basta." };

  if (has(text, ["paleta", "colores"])) {
    return { ...empty, intent: "paleta", spoken: "Saco la paleta de la lamina abierta. Cuesta 0.", press: "ficha" };
  }
  if (/\bescena\b/.test(text) || has(text, ["coloca", "mueve", "ponla", "poner en"])) {
    return { ...empty, intent: "escena", spoken: "Voy a la escena. Mover no pinta. Cuesta 0.", press: "componer" };
  }

  const placeWords = has(text, ["fondo", "lugar", "muelle", "escenario", "paisaje", "estero"]);
  const newPerson =
    !placeWords &&
    (has(text, ["un personaje", "otro personaje", "una persona", "un tipo", "quiero un personaje", "crea un personaje"]) ||
      (asset?.kind === "personaje" &&
        has(text, ["traje", "vestido"]) &&
        !asset.spec.costume.toLowerCase().includes("traje")));

  if (newPerson) {
    const name = nameFrom(text, "personaje");
    const costume = costumeFrom(text, "");
    const role = `${heightFrom(text)}. Vive en ${WORLD.place}.`;
    const never = ["No joyas inventadas", "No look de revista", "No cambiar el vestuario aprobado"];
    return {
      said,
      intent: "nuevo_personaje",
      view: "frente",
      spoken: `No es un prompt suelto. ${name}, ${role} Ropa: ${costume} Ficha primero, luego el frente.`,
      paint: paintLock("frente", `${name}. ${role} ${costume} Mundo ${WORLD.title}. Una sola persona.`),
      createKind: "personaje",
      createName: name,
      spec: { role, costume, never, notes: said.trim() },
      press: "pintar",
    };
  }

  if (has(text, ["fondo nuevo", "otro fondo", "otro lugar", "un escenario", "un paisaje", "un muelle", "quiero un fondo", "crea un fondo", "pinta un lugar"])) {
    const name = nameFrom(text, "fondo");
    const light = lightFrom(text);
    const notes = `${WORLD.place}. ${light} Sin personajes pintados.`;
    return {
      said,
      intent: "nuevo_fondo",
      view: "fondo",
      spoken: `Lugar nuevo: ${name}. ${light} Se pinta una vez y despues se rueda.`,
      paint: paintLock("fondo", `${name}. ${notes}`),
      createKind: "fondo",
      createName: name,
      spec: { notes, never: ["No pintar personas en el fondo"], role: light },
      press: "pintar",
    };
  }

  const view = pickView(text);
  if (view === "fondo") {
    const target = asset?.kind === "fondo" ? asset : project?.assets.find((item) => item.kind === "fondo");
    const notes = target?.spec.notes || `${WORLD.place}. ${lightFrom(text)}`;
    return {
      said,
      intent: "fondo",
      view: "fondo",
      spoken: target?.takes.length ? `${target.name} ya tiene lamina. La reuso.` : `Fondo: ${target?.name ?? "lugar"}. Sin personas.`,
      paint: paintLock("fondo", `${target?.name ?? "Lugar"}. ${notes}`),
      createName: "",
      spec: {},
      press: target?.takes.length ? "reusar" : "pintar",
    };
  }

  if (view && asset && asset.kind === "personaje") {
    const have = asset.takes.find((take) => take.view === view);
    const costume = asset.spec.costume || costumeFrom(text, "");
    const press: Press = have ? "reusar" : asset.takes.length > 0 ? "derivar" : "pintar";
    const spoken =
      press === "reusar"
        ? `${VIEW_LABEL[view]} de ${asset.name} ya existe. No pinto otra cara.`
        : press === "derivar"
          ? `${VIEW_LABEL[view]} sale de una toma que ya tienes. Coste 0.`
          : `${asset.name}, ${VIEW_LABEL[view]}. Ropa: ${costume}`;
    return {
      said,
      intent: "vista",
      view,
      spoken,
      paint: paintLock(view, `El mismo ${asset.name}. ${asset.spec.role} ${costume} ${asset.spec.never.join(". ")}.`),
      createName: "",
      spec: {},
      press,
    };
  }

  if (asset && has(text, ["ficha", "ropa", "vestuario", "oficio"])) {
    return {
      said,
      intent: "ficha",
      view: null,
      spoken: `Actualizo la ficha de ${asset.name}. No pinto.`,
      paint: "",
      createName: "",
      spec: { costume: costumeFrom(text, asset.spec.costume), notes: said.trim() },
      press: "ficha",
    };
  }

  if (asset) {
    return {
      ...empty,
      spoken: `Abierto: ${asset.name}. Di frente, perfil o fondo. Si es otra persona: un personaje.`,
      paint: paintLock(asset.kind === "fondo" ? "fondo" : "frente", `${asset.name}. ${asset.spec.costume}`),
    };
  }
  return { ...empty, spoken: "Abre un personaje o di quiero un personaje / quiero un fondo." };
}

export function directorPacket(brief: Brief, asset: Asset | undefined) {
  return [
    `Pedido: ${brief.said}`,
    `Como lo lei: ${brief.spoken}`,
    brief.paint ? `Brief de pintura: ${brief.paint}` : "",
    `Abierto: ${asset?.name ?? "nada"} (${asset?.kind ?? ""}).`,
    asset?.spec.costume ? `Vestuario ley: ${asset.spec.costume}` : "",
    "Obedece el brief. No lo vuelvas generico. Una sola generar_lamina si falta maestro.",
  ]
    .filter(Boolean)
    .join("\n");
}
