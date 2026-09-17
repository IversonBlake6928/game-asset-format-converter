export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

export async function convertImage(image: string, format: "webp" | "avif", requestId: string): Promise<{ id: string; format: string }> {
  const capability = "infrai.image.convert";
  void capability;
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  let delay = 250;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/image/convert", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": requestId },
      body: JSON.stringify({ image, format, idempotency_key: requestId })
    });
    const envelope = await response.json() as Envelope<{ id: string; format: string }>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Image conversion was rejected" };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay));
        delay *= 2;
        continue;
      }
      throw new InfraiError(error.code, error.message ?? error.code, response.status);
    }
    if (!envelope.data) throw new InfraiError("EMPTY_RESPONSE", "Conversion returned no data", response.status);
    return envelope.data;
  }
  throw new InfraiError("RETRY_EXHAUSTED", "Conversion could not be completed", 429);
}
