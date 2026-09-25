import { createServerFn } from "@tanstack/react-start";

export type PlateResult = { ok: true; dataUrl: string } | { ok: false; error: string };

const VIEWS = ["frente", "perfil", "tres_cuartos", "espalda", "expresion", "fondo", "prop", "boceto"] as const;

export const generarLamina = createServerFn({ method: "POST" })
  .validator(
    (input: { prompt: string; view: string; reference?: string; imageKey?: string }) => {
      if (!input || typeof input.prompt !== "string" || input.prompt.length < 8 || input.prompt.length > 1800) {
        throw new Error("Prompt inválido");
      }
      if (!VIEWS.includes(input.view as (typeof VIEWS)[number])) throw new Error("Vista inválida");
      const reference = input.reference;
      if (reference && (typeof reference !== "string" || !reference.startsWith("data:image/") || reference.length > 2_000_000)) {
        throw new Error("La referencia no sirve o pesa demasiado");
      }
      const imageKey = typeof input.imageKey === "string" ? input.imageKey.trim() : "";
      return { prompt: input.prompt, view: input.view, reference, imageKey };
    },
  )
  .handler(async ({ data }): Promise<PlateResult> => {
    const apiKey = process.env.XAI_API_KEY || data.imageKey;
    if (!apiKey) {
      return { ok: false, error: "Falta el motor de imagen. En Ajustes pega una clave xAI, o defínela como XAI_API_KEY." };
    }
    const aspect = data.view === "fondo" ? "16:9" : "2:3";
    const locked = [
      data.prompt,
      "Animación 2D profesional, línea limpia, color plano, sin texto, sin marca de agua, sin personajes extra.",
      data.view === "fondo" ? "Lámina de fondo ancha, sin personas." : "Cuerpo entero, margen amplio, fondo de papel cálido.",
    ].join(" ");
    const endpoint = data.reference ? "https://api.x.ai/v1/images/edits" : "https://api.x.ai/v1/images/generations";
    const payload = data.reference
      ? {
          model: "grok-imagine-image",
          prompt: locked,
          images: [{ type: "image_url", url: data.reference }],
          aspect_ratio: aspect,
          response_format: "b64_json",
        }
      : {
          model: "grok-imagine-image",
          prompt: locked,
          n: 1,
          resolution: "1k",
          response_format: "b64_json",
        };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, error: `El motor de imagen respondió ${res.status}. ${detail.slice(0, 160)}` };
    }
    const body = (await res.json()) as {
      data?: { b64_json?: string; url?: string }[];
      url?: string;
      b64_json?: string;
    };
    const item = body.data?.[0];
    const b64 = item?.b64_json || body.b64_json;
    if (b64) return { ok: true, dataUrl: `data:image/jpeg;base64,${b64}` };
    const url = item?.url || body.url;
    if (!url) return { ok: false, error: "El motor no devolvió imagen." };
    const image = await fetch(url);
    if (!image.ok) return { ok: false, error: "No pude descargar la lámina." };
    const bytes = Buffer.from(await image.arrayBuffer());
    const mime = image.headers.get("content-type") || "image/jpeg";
    return { ok: true, dataUrl: `data:${mime};base64,${bytes.toString("base64")}` };
  });
