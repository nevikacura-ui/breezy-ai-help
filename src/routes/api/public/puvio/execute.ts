import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PUVIO_APP_ID } from "@/lib/puvio-config";
import { equalHexSignatures, isFreshPuvioTimestamp, sha256Hex, signPuvioRequest } from "@/lib/puvio-protocol.server";

const executeSchema = z.object({
  action: z.string().min(3).max(120).regex(/^[a-z][a-z0-9_.]+$/),
  input: z.record(z.unknown()).optional(),
  params: z.record(z.unknown()).optional(),
  payload: z.record(z.unknown()).optional(),
  idempotency_key: z.string().min(8).max(200).optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
});

function unauthorized(message = "Invalid Puvio signature.") {
  return Response.json({ status: "FAILED", error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}

export const Route = createFileRoute("/api/public/puvio/execute")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const keyId = request.headers.get("x-puvio-key-id") ?? "";
        const timestamp = request.headers.get("x-puvio-timestamp") ?? "";
        const nonce = request.headers.get("x-puvio-nonce") ?? "";
        const signature = request.headers.get("x-puvio-signature") ?? "";
        const expectedKeyId = process.env.PUVIO_EXEC_KEY_ID ?? "";
        const signingKey = process.env.PUVIO_EXEC_SIGNING_KEY ?? "";

        if (!keyId || !timestamp || !nonce || !signature) return unauthorized("Missing Puvio signature headers.");
        if (nonce.length < 8 || nonce.length > 200 || !expectedKeyId || keyId !== expectedKeyId) return unauthorized();
        if (!isFreshPuvioTimestamp(timestamp)) return unauthorized("Puvio request timestamp expired.");
        if (!signingKey) return unauthorized();

        const url = new URL(request.url);
        const expectedSignature = await signPuvioRequest({
          secret: signingKey,
          timestamp,
          nonce,
          method: request.method,
          pathWithQuery: `${url.pathname}${url.search}`,
          rawBody,
        });
        if (!equalHexSignatures(signature, expectedSignature)) return unauthorized();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nonceKey = `puvio:nonce:${await sha256Hex(nonce)}`;
        const nonceResult = await supabaseAdmin.from("webhook_events").insert({
          source: "puvio-nonce",
          event_key: nonceKey,
          event_type: "protocol_1_1",
          status: "VERIFIED",
          signature_ok: true,
          verified: true,
          payload: { timestamp, key_id: keyId },
        } as never);
        if (nonceResult.error) {
          if ((nonceResult.error as { code?: string }).code === "23505") return unauthorized("Puvio nonce has already been used.");
          console.error("Puvio nonce persistence failed", nonceResult.error.message);
          return Response.json({ status: "FAILED", error: { code: "REPLAY_STORE_UNAVAILABLE", message: "Could not validate request replay protection." } }, { status: 503 });
        }

        let parsedBody: z.infer<typeof executeSchema>;
        try {
          parsedBody = executeSchema.parse(JSON.parse(rawBody));
        } catch {
          return Response.json({ status: "FAILED", error: { code: "INVALID_REQUEST", message: "Expected a valid Puvio action and JSON input." } }, { status: 400 });
        }

        const idempotencyKey = parsedBody.idempotency_key ?? parsedBody.idempotencyKey ?? request.headers.get("idempotency-key") ?? nonce;
        const bodyHash = await sha256Hex(rawBody);
        const executionKey = `puvio:execute:${await sha256Hex(idempotencyKey)}`;
        const executionInsert = await supabaseAdmin.from("webhook_events").insert({
          source: "puvio-execute",
          event_key: executionKey,
          reference_id: parsedBody.action,
          event_type: parsedBody.action,
          status: "PROCESSING",
          signature_ok: true,
          verified: true,
          payload: { action: parsedBody.action, body_hash: bodyHash },
        } as never);

        if (executionInsert.error) {
          if ((executionInsert.error as { code?: string }).code !== "23505") {
            console.error("Puvio idempotency persistence failed", executionInsert.error.message);
            return Response.json({ status: "FAILED", error: { code: "IDEMPOTENCY_STORE_UNAVAILABLE", message: "Could not start this Puvio action." } }, { status: 503 });
          }
          const { data: previous } = await supabaseAdmin
            .from("webhook_events" as never)
            .select("status, payload")
            .eq("event_key", executionKey)
            .maybeSingle();
          const previousRow = previous as unknown as { payload?: unknown } | null;
          const payload = (previousRow?.payload ?? {}) as { body_hash?: string; response?: unknown; http_status?: number };
          if (payload.body_hash !== bodyHash) {
            return Response.json({ status: "FAILED", error: { code: "IDEMPOTENCY_CONFLICT", message: "This idempotency key was used for a different request." } }, { status: 409 });
          }
          if (payload.response) return Response.json(payload.response, { status: payload.http_status ?? 200 });
          return Response.json({ status: "FAILED", error: { code: "ACTION_IN_PROGRESS", message: "This Puvio action is still processing." } }, { status: 409 });
        }

        let responseBody: unknown;
        let httpStatus = 200;
        try {
          if (parsedBody.action === "puvio.connectivity_probe") {
            responseBody = { status: "SUCCEEDED", result: { connected: true, protocol: "1.1" } };
          } else {
            const { executePuvioCapability } = await import("@/lib/puvio-capabilities.server");
            const result = await executePuvioCapability(
              supabaseAdmin,
              parsedBody.action,
              parsedBody.input ?? parsedBody.params ?? parsedBody.payload ?? {},
              {
                appId: process.env.PUVIO_APP_ID ?? PUVIO_APP_ID,
                submissionToken: process.env.PUVIO_SUBMISSION_TOKEN ?? "",
                billing: {
                  appId: process.env.PUVIO_APP_ID ?? PUVIO_APP_ID,
                  keyId: expectedKeyId,
                  signingKey,
                  returnUrl: "https://askeasy.ai/billing/return",
                },
              },
            );
            responseBody = { status: "SUCCEEDED", result };
          }
        } catch (error) {
          httpStatus = 400;
          responseBody = {
            status: "FAILED",
            error: { code: "CAPABILITY_FAILED", message: error instanceof Error ? error.message.slice(0, 300) : "The Puvio action failed." },
          };
        }

        const storedPayload = { action: parsedBody.action, body_hash: bodyHash, response: responseBody, http_status: httpStatus };
        const { error: completionError } = await supabaseAdmin
          .from("webhook_events" as never)
          .update({ status: httpStatus === 200 ? "SUCCEEDED" : "FAILED", payload: storedPayload as never } as never)
          .eq("event_key", executionKey);
        if (completionError) console.error("Puvio result persistence failed", completionError.message);
        return Response.json(responseBody, { status: httpStatus });
      },
    },
  },
});
