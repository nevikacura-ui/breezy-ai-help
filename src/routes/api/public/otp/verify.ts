import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/otp/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { normalizePhone, verifyOtp, auditOtp } = await import("@/lib/otp-store.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        const ua = request.headers.get("user-agent");

        let body: { phone?: string; otp?: string } = {};
        try {
          body = (await request.json()) as { phone?: string; otp?: string };
        } catch {
          /* ignore */
        }

        const mobile = normalizePhone(body.phone ?? "");
        const otp = (body.otp ?? "").replace(/\D/g, "");
        if (!mobile || otp.length !== 6) {
          return Response.json({ error: "Enter the 6-digit code." }, { status: 400 });
        }

        const result = await verifyOtp(mobile, otp);
        if (!result.ok) {
          await auditOtp({ phone: mobile, action: "verify", status: "failed", error: result.reason, ip, user_agent: ua });
          return Response.json({ error: result.reason }, { status: result.status });
        }

        const email = `phone_${mobile}@users.askeasy.ai`;
        const created = await supabaseAdmin.auth.admin.createUser({
          email,
          phone: mobile,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { phone: mobile, phone_verified: true, login_method: "phone_otp" },
        });
        if (created.error) {
          const msg = `${created.error.message} ${created.error.code ?? ""}`;
          const alreadyExists = created.error.status === 422 || /exists|registered|duplicate|already/i.test(msg);
          if (!alreadyExists) {
            await auditOtp({ phone: mobile, action: "verify", status: "failed", error: created.error.message, ip, user_agent: ua });
            return Response.json({ error: "Could not complete sign-in." }, { status: 500 });
          }
        }

        const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
        const tokenHash = link.data?.properties?.hashed_token;
        if (link.error || !tokenHash) {
          await auditOtp({ phone: mobile, action: "verify", status: "failed", error: link.error?.message ?? "no token", ip, user_agent: ua });
          return Response.json({ error: "Could not complete sign-in." }, { status: 500 });
        }

        await auditOtp({ phone: mobile, action: "verify", status: "success", ip, user_agent: ua });
        return Response.json({ ok: true, token_hash: tokenHash, type: "magiclink", email });
      },
    },
  },
});
