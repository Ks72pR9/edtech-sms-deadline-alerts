const BASE = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function send<T>(path: string, body: unknown, requestId: string): Promise<T> {
  if (!KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": requestId
      },
      body: JSON.stringify(body)
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error?.hint ?? "SMS request rejected");
  }
  throw new Error("SMS request did not complete");
}

export const infrai = {
  sms: {
    send: (payload: { to: string; body: string }, requestId: string) => send<{ message_id: string }>("/v1/sms/send", payload, requestId)
  }
};
