const encoder = new TextEncoder();

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function puvioSignaturePayload(input: {
  timestamp: string;
  nonce: string;
  method: string;
  pathWithQuery: string;
  bodyHash: string;
}): string {
  return [
    "PUVIO-HMAC-SHA256",
    input.timestamp,
    input.nonce,
    input.method.toUpperCase(),
    input.pathWithQuery,
    input.bodyHash,
  ].join("\n");
}

export async function signPuvioRequest(input: {
  secret: string;
  timestamp: string;
  nonce: string;
  method: string;
  pathWithQuery: string;
  rawBody: string;
}): Promise<string> {
  const bodyHash = await sha256Hex(input.rawBody);
  return hmacSha256Hex(input.secret, puvioSignaturePayload({ ...input, bodyHash }));
}

export function puvioBillingReturnPayload(input: {
  id: string;
  status: string;
  ref: string;
  ts: string;
}): string {
  return ["puvio-billing-return", input.id, input.status, input.ref, input.ts].join("\n");
}

export function equalHexSignatures(received: string, expected: string): boolean {
  const a = received.trim().toLowerCase();
  const b = expected.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b) || a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export function isFreshPuvioTimestamp(timestamp: string, nowMs = Date.now()): boolean {
  if (!/^\d{10}$/.test(timestamp)) return false;
  const ageSeconds = Math.abs(nowMs / 1000 - Number(timestamp));
  return ageSeconds <= 300;
}
