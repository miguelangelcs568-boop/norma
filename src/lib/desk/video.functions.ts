import { createServerFn } from "@tanstack/react-start";

export type ClipResult = { ok: true; url: string } | { ok: false; error: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const generarClip = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; image: string; imageKey?: string; seconds?: number }) => {
    if (!input || typeof input.prompt !== "string" || input.prompt.length < 8 || input.prompt.length > 1200) {
      throw new Error("Pedido de clip inválido");
    }
    if (typeof input.image !== "string" || !input.image.startsWith("data:image/") || input.image.length > 3_500_000) {
      throw new Error("El plano pesa demasiado para animarlo");
    }
    const seconds = input.seconds === 3 || input.seconds === 5 ? input.seconds : 4;
    const imageKey = typeof input.imageKey === "string" ? input.imageKey.trim() : "";
    return { prompt: input.prompt, image: input.image, imageKey, seconds };
  })
  .handler(async ({ data }): Promise<ClipResult> => {
    const apiKey = process.env.XAI_API_KEY || data.imageKey;
    if (!apiKey) {
      return {
        ok: false,
        error: "Para que camine de verdad hace falta la clave xAI en Ajustes. No usamos el muñeco articulado.",
      };
    }
    const started = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-video-1.5",
        prompt: data.prompt,
        image: { url: data.image },
        duration: data.seconds,
      }),
    });
    const launch = (await started.json()) as { request_id?: string; error?: { message?: string }; message?: string };
    if (!started.ok || !launch.request_id) {
      const detail = launch.error?.message || launch.message || `xAI ${started.status}`;
      return { ok: false, error: `No arrancó el clip. ${detail.slice(0, 180)}` };
    }
    for (let i = 0; i < 30; i++) {
      await sleep(4000);
      const poll = await fetch(`https://api.x.ai/v1/videos/${launch.request_id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const body = (await poll.json()) as {
        status?: string;
        video?: { url?: string };
        url?: string;
        error?: { message?: string };
      };
      if (body.status === "done" && (body.video?.url || body.url)) {
        return { ok: true, url: body.video?.url || body.url || "" };
      }
      if (body.status === "failed" || body.status === "expired") {
        return { ok: false, error: body.error?.message || "El clip falló." };
      }
    }
    return { ok: false, error: "El clip tardó demasiado. Intenta otra vez." };
  });
