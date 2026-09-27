import { createServerFn } from "@tanstack/react-start";

export type CallArgs = {
  costume: string;
  role: string;
  notes: string;
  never: string[];
  view: string;
  prompt: string;
  kind: string;
  name: string;
  x: number | null;
  y: number | null;
  scale: number | null;
};

export type DirectorResult =
  | {
      ok: true;
      text: string;
      calls: { name: string; args: CallArgs }[];
    }
  | { ok: false; error: string };

function readArgs(raw: unknown): CallArgs {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { [key: string]: unknown }) : {};
  const str = (key: string): string => (typeof obj[key] === "string" ? (obj[key] as string) : "");
  const num = (key: string): number | null =>
    typeof obj[key] === "number" && Number.isFinite(obj[key] as number) ? (obj[key] as number) : null;
  const never = Array.isArray(obj.never) ? obj.never.filter((item): item is string => typeof item === "string") : [];
  return {
    costume: str("costume"),
    role: str("role"),
    notes: str("notes"),
    never,
    view: str("view"),
    prompt: str("prompt"),
    kind: str("kind"),
    name: str("name"),
    x: num("x"),
    y: num("y"),
    scale: num("scale"),
  };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "ficha",
      description: "Actualiza la ficha del activo del chat abierto. No genera píxeles. Cuesta 0.",
      parameters: {
        type: "object",
        properties: {
          costume: { type: "string" },
          role: { type: "string" },
          notes: { type: "string" },
          never: { type: "array", items: { type: "string" } },
        },
        required: ["notes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crear_activo",
      description: "Abre un personaje o lugar nuevo con su propio chat. No pinta. Cuesta 0.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["personaje", "fondo"] },
          name: { type: "string" },
          costume: { type: "string" },
          role: { type: "string" },
          notes: { type: "string" },
          never: { type: "array", items: { type: "string" } },
        },
        required: ["kind", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fijar",
      description: "Fija la toma activa del chat abierto. Cuesta 0.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "generar_lamina",
      description:
        "Pide UNA lámina nueva. Último recurso. Cuesta 1. Máximo una por respuesta. Si ya hay cara, no la uses.",
      parameters: {
        type: "object",
        properties: {
          view: {
            type: "string",
            enum: ["frente", "perfil", "tres_cuartos", "espalda", "expresion", "fondo"],
          },
          prompt: { type: "string" },
        },
        required: ["view", "prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "componer_escena",
      description: "Mueve el personaje ya dibujado sobre el fondo ya dibujado. Cuesta 0.",
      parameters: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" },
          scale: { type: "number" },
        },
        required: ["x", "y", "scale"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "paleta",
      description: "Extrae colores de la lámina abierta. Cuesta 0.",
      parameters: { type: "object", properties: {} },
    },
  },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM =
  "Eres el director de un estudio 2D. Dentro de ti hay tres oficios: fichista (escribe ley), archivo (no olvida el canon del corto) y prensa (reusa, deriva, y solo entonces pinta). " +
  "Hablas español, corto. Este chat es de UN activo; el brief lista el resto del corto. No mezcles a Lina con un personaje nuevo. " +
  "No regeneres una película. generar_lamina cuesta 1 y solo una por respuesta. crear_activo, ficha, fijar, paleta y componer_escena cuestan 0. " +
  "Si hay imagen adjunta, mírala. No describas un dibujo que no vas a pedir.";

export const dirigir = createServerFn({ method: "POST" })
  .validator((input: { apiKey?: string; brief: string; history: ChatMessage[]; imageDataUrl?: string }) => {
    if (!input || typeof input.brief !== "string" || input.brief.length < 1 || input.brief.length > 4000) {
      throw new Error("Mensaje inválido");
    }
    const history = Array.isArray(input.history) ? input.history.slice(-8) : [];
    for (const message of history) {
      if (message.role !== "user" && message.role !== "assistant") throw new Error("Historial inválido");
      if (typeof message.content !== "string" || message.content.length > 2000) throw new Error("Historial inválido");
    }
    const imageDataUrl = input.imageDataUrl;
    if (imageDataUrl && (typeof imageDataUrl !== "string" || imageDataUrl.length > 1_500_000)) {
      throw new Error("La lámina pesa demasiado para leerla");
    }
    const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
    return { apiKey, brief: input.brief, history, imageDataUrl };
  })
  .handler(async ({ data }): Promise<DirectorResult> => {
    const apiKey = data.apiKey || process.env.DEEPSEEK_API_KEY || "";
    if (!apiKey) return { ok: false, error: "Falta la clave de DeepSeek. El chat local sigue funcionando." };
    const userContent = data.imageDataUrl
      ? [
          { type: "text", text: data.brief },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ]
      : data.brief;
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-flash",
        max_tokens: 700,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM },
          ...data.history.map((message) => ({ role: message.role, content: message.content })),
          { role: "user", content: userContent },
        ],
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, error: `DeepSeek respondió ${res.status}. ${detail.slice(0, 180)}` };
    }
    const body = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: { function?: { name?: string; arguments?: string } }[];
        };
      }[];
    };
    const message = body.choices?.[0]?.message;
    const calls = (message?.tool_calls ?? []).flatMap((call) => {
      const name = call.function?.name;
      if (!name) return [];
      let args = readArgs({});
      try {
        args = readArgs(JSON.parse(call.function?.arguments || "{}"));
      } catch {
        args = readArgs({});
      }
      return [{ name, args }];
    });
    return { ok: true, text: message?.content?.trim() || "", calls: calls.slice(0, 3) };
  });
