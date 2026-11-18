import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  equalHexSignatures,
  isFreshPuvioTimestamp,
  puvioBillingReturnPayload,
  puvioSignaturePayload,
  signPuvioRequest,
} from "@/lib/puvio-protocol.server";

describe("Puvio Protocol 1.1 signatures", () => {
  it("signs the exact timestamp, nonce, method, path+query, and body hash payload", async () => {
    const rawBody = JSON.stringify({ action: "puvio.connectivity_probe" });
    const bodyHash = createHash("sha256").update(rawBody).digest("hex");
    const payload = puvioSignaturePayload({
      timestamp: "1763456789",
      nonce: "nonce-12345678",
      method: "post",
      pathWithQuery: "/api/public/puvio/execute?source=probe",
      bodyHash,
    });
    expect(payload).toBe(`PUVIO-HMAC-SHA256\n1763456789\nnonce-12345678\nPOST\n/api/public/puvio/execute?source=probe\n${bodyHash}`);

    const signature = await signPuvioRequest({
      secret: "test-only-shared-secret",
      timestamp: "1763456789",
      nonce: "nonce-12345678",
      method: "POST",
      pathWithQuery: "/api/public/puvio/execute?source=probe",
      rawBody,
    });
    const expected = createHmac("sha256", "test-only-shared-secret").update(payload).digest("hex");
    expect(signature).toBe(expected);
    expect(equalHexSignatures(signature.toUpperCase(), expected)).toBe(true);
    expect(equalHexSignatures(signature.replace(/.$/, "0"), expected)).toBe(false);
  });

  it("accepts exactly 300 seconds and rejects older or future-dated requests", () => {
    const now = Date.UTC(2026, 10, 18, 7, 0, 0);
    const currentSeconds = Math.floor(now / 1000);
    expect(isFreshPuvioTimestamp(String(currentSeconds - 300), now)).toBe(true);
    expect(isFreshPuvioTimestamp(String(currentSeconds - 301), now)).toBe(false);
    expect(isFreshPuvioTimestamp(String(currentSeconds + 301), now)).toBe(false);
    expect(isFreshPuvioTimestamp("not-a-timestamp", now)).toBe(false);
  });
});

describe("Puvio billing return signatures", () => {
  it("uses the required puvio-billing-return field order", () => {
    expect(puvioBillingReturnPayload({ id: "session_123", status: "paid", ref: "ae_order_123", ts: "1763456789" }))
      .toBe("puvio-billing-return\nsession_123\npaid\nae_order_123\n1763456789");
  });
});
