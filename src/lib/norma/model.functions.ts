import { createServerFn } from "@tanstack/react-start";

export type ModelResult = { ok: true; text: string } | { ok: false; error: string };

export const proponerConModelo = createServerFn({ method: "POST" })
  .validator((input: { brief: string }) => {
    if (!input || typeof input.brief !== "string" || input.brief.length < 8 || input.brief.length > 4000) {
      throw new Error("Brief inválido");
    }
    return { brief: input.brief };
  })
  .handler(async ({ data }): Promise<ModelResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "El modelo no está conectado. La matemática sigue en cero." };
    }
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 280,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Eres el departamento de layout de un estudio de animación. No describes imágenes. Devuelves únicamente un objeto JSON con números dentro de los rangos del brief y una clave nota. Sin markdown.",
          },
          { role: "user", content: data.brief },
        ],
      }),
    });
    if (!res.ok) return { ok: false, error: `El modelo respondió ${res.status}. No se aplicó nada.` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    if (!text) return { ok: false, error: "El modelo volvió vacío." };
    return { ok: true, text };
  });
