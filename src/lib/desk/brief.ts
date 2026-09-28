import { isActing } from "./partitura";
import { VIEW_LABEL, type Asset, type DeskProject, type Spec, type ViewName } from "./types";
import { isWalkAsk } from "./walk";

export type Press = "reusar" | "derivar" | "pintar" | "componer" | "ficha" | "nada";

export type Brief = {
  said: string;
  intent: "vista" | "fondo" | "ficha" | "escena" | "partitura" | "caminar" | "nuevo_plano" | "nuevo_personaje" | "nuevo_fondo" | "paleta" | "hablar";
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

  if (has(text, ["otro plano", "siguiente plano", "nuevo plano", "plano nuevo"])) {
    return { ...empty, intent: "nuevo_plano", spoken: "Abro el siguiente plano del rollo. 0 láminas.", press: "componer" };
  }

  if (isWalkAsk(text)) {
    return {
      ...empty,
      intent: "caminar",
      spoken: "Anda unos segundos. La cara es la lámina. Piernas y brazos se articulan. 0 láminas nuevas.",
      press: "componer",
    };
  }

  if (isActing(text) || (asset?.kind === "escena" && !has(text, ["fondo nuevo", "otro fondo"]))) {
    if (isActing(text) || asset?.kind === "escena") {
      return {
        ...empty,
        intent: "partitura",
        spoken: "Parto la frase en poses. Reuso las láminas que ya hay.",
        press: "componer",
      };
    }
  }

  if (/\bescena\b/.test(text) || has(text, ["coloca", "mueve", "ponla", "poner en"])) {
    return { ...empty, intent: "escena", spoken: "Voy a la escena. Mover no pinta.", press: "componer" };
  }

  const placeWords = has(text, ["fondo", "lugar", "muelle", "escenario", "paisaje", "estero"]);
  const newPerson =
    !placeWords &&
    (has(text, ["un personaje", "otro personaje", "una persona", "un tipo", "quiero un personaje", "crea un personaje"]) ||
      (asset?.kind === "personaje" && has(text, ["traje", "vestido"]) && !asset.spec.costume.toLowerCase().includes("traje")));

  if (newPerson) {
    const name = nameFrom(text, "personaje");
    const costume = costumeFrom(text, "");
    const role = `${heightFrom(text)}. Vive en ${WORLD.place}.`;
    const never = ["No joyas inventadas", "No look de revista", "No cambiar el vestuario aprobado"];
    return {
      said,
      intent: "nuevo_personaje",
      view: "frente",
      spoken: `Ficha de ${name}. ${role}`,
      paint: paintLock("frente", `${name}. ${role} ${costume}`),
      createKind: "personaje",
      createName: name,
      spec: { role, costume, never, notes: said.trim() },
      press: "ficha",
    };
  }

  if (has(text, ["fondo nuevo", "otro fondo", "otro lugar", "un escenario", "un paisaje", "un muelle", "quiero un fondo", "crea un fondo", "pinta un lugar"])) {
    const name = nameFrom(text, "fondo");
    const light = lightFrom(text);
    return {
      said,
      intent: "nuevo_fondo",
      view: "fondo",
      spoken: `Lugar nuevo: ${name}.`,
      paint: paintLock("fondo", `${name}. ${WORLD.place}. ${light}`),
      createKind: "fondo",
      createName: name,
      spec: { notes: `${WORLD.place}. ${light}`, never: ["No pintar personas en el fondo"], role: light },
      press: "ficha",
    };
  }

  const view = pickView(text);
  if (view === "fondo") {
    const target = asset?.kind === "fondo" ? asset : project?.assets.find((item) => item.kind === "fondo");
    return {
      said,
      intent: "fondo",
      view: "fondo",
      spoken: target?.takes.length ? `${target.name} ya tiene lamina.` : `Fondo: ${target?.name ?? "lugar"}.`,
      paint: paintLock("fondo", `${target?.name ?? "Lugar"}.`),
      createName: "",
      spec: {},
      press: target?.takes.length ? "reusar" : "pintar",
    };
  }

  if (view && asset && asset.kind === "personaje") {
    const have = asset.takes.find((take) => take.view === view);
    const press: Press = have ? "reusar" : asset.takes.length > 0 ? "derivar" : "pintar";
    return {
      said,
      intent: "vista",
      view,
      spoken: press === "reusar" ? `${VIEW_LABEL[view]} ya existe.` : press === "derivar" ? `${VIEW_LABEL[view]} se deriva.` : `${VIEW_LABEL[view]}.`,
      paint: paintLock(view, `${asset.name}. ${asset.spec.costume}`),
      createName: "",
      spec: {},
      press,
    };
  }

  if (asset && has(text, ["ficha", "ropa", "vestuario", "oficio"])) {
    return { said, intent: "ficha", view: null, spoken: `Actualizo ${asset.name}.`, paint: "", createName: "", spec: { costume: costumeFrom(text, asset.spec.costume), notes: said.trim() }, press: "ficha" };
  }

  if (asset) {
    return { ...empty, spoken: asset.kind === "escena" ? "Di una acción o que camine." : `Chat de ${asset.name}.` };
  }
  return { ...empty, spoken: "Abre un personaje o di quiero un personaje." };
}

export function directorPacket(brief: Brief, asset: Asset | undefined, project?: DeskProject) {
  return [`Corto: ${project?.title ?? WORLD.title}`, `Pedido: ${brief.said}`, brief.spoken, "Si piden caminar, articula. No pintes el capítulo."].join("\n");
}
