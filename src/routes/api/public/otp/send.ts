import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/otp/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          normalizePhone,
          generateOtp,
          storeOtp,
          sendOtpSms,
          auditOtp,
          checkSendThrottle,
        } = await import("@/lib/otp-store.server");

        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        const ua = request.headers.get("user-agent");

        let body: { phone?: string } = {};
        try {
          body = (await request.json()) as { phone?: string };
        } catch {
          /* ignore */
        }

        const mobile = normalizePhone(body.phone ?? "");
        if (!mobile) {
          return Response.json({ error: "Enter a valid Indian mobile number." }, { status: 400 });
        }

        const throttle = await checkSendThrottle(mobile, ip);
        if (!throttle.ok) {
          await auditOtp({ phone: mobile, action: "send", status: "rate_limited", error: throttle.reason, ip, user_agent: ua });
          return Response.json(
            { error: throttle.reason, retryAfter: throttle.retryAfter },
            { status: 429, headers: { "Retry-After": String(throttle.retryAfter) } },
          );
        }

        const code = generateOtp();
        const sent = await sendOtpSms(mobile, code);
        if (!sent.ok) {
          await auditOtp({ phone: mobile, action: "send", status: "failed", error: sent.error, ip, user_agent: ua });
          return Response.json({ error: sent.error }, { status: 502 });
        }

        await storeOtp(mobile, code);
        await auditOtp({ phone: mobile, action: "send", status: "success", ip, user_agent: ua });

        return Response.json({ ok: true, message: `OTP sent to +${mobile}`, phone: mobile });
      },
    },
  },
});
