import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { emails, tournament } = await req.json();

    if (!emails?.length) {
      return new Response(JSON.stringify({ error: "No emails provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") ?? "";
    const signupUrl = `${origin}/#/signup?tournament=${tournament.id}`;

    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];

    for (const email of emails) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SquashStay <onboarding@resend.dev>",
          to: [email],
          subject: `Host squash players at ${tournament.name}`,
          html: buildEmail(tournament, signupUrl),
        }),
      });

      if (res.ok) {
        sent.push(email);
      } else {
        const err = await res.json().catch(() => ({ message: "Unknown error" }));
        failed.push({ email, error: err.message ?? "Unknown error" });
      }
    }

    return new Response(JSON.stringify({ sent: sent.length, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildEmail(tournament: Record<string, string>, signupUrl: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;color:#1a1a2e;background:#fff;">
  <div style="text-align:center;margin-bottom:32px;">
    <span style="font-size:40px;">🏸</span>
    <h1 style="margin:8px 0;font-size:26px;color:#1a1a2e;">Host squash players at<br>${tournament.name}</h1>
  </div>

  <p style="font-size:16px;line-height:1.6;">We're recruiting host families for <strong>${tournament.name}</strong> — a PSA Challenger squash tournament. Opening your home to an international player is a wonderful way to connect with the global squash community.</p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;border-radius:8px;overflow:hidden;">
    <tr style="background:#f4f4fb;">
      <td style="padding:12px 16px;color:#666;white-space:nowrap;">📅 Dates</td>
      <td style="padding:12px 16px;font-weight:600;">${fmt(tournament.start_date)} – ${fmt(tournament.end_date)}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;color:#666;white-space:nowrap;">📍 Venue</td>
      <td style="padding:12px 16px;font-weight:600;">${tournament.venue_name}, ${tournament.venue_city}, ${tournament.venue_state}</td>
    </tr>
    ${tournament.description ? `<tr style="background:#f4f4fb;"><td style="padding:12px 16px;color:#666;white-space:nowrap;">ℹ️ About</td><td style="padding:12px 16px;">${tournament.description}</td></tr>` : ""}
  </table>

  <div style="text-align:center;margin:36px 0;">
    <a href="${signupUrl}" style="background:#6c63ff;color:#fff;padding:16px 36px;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px;display:inline-block;">Sign up to host →</a>
  </div>

  <p style="color:#999;font-size:12px;text-align:center;margin-top:40px;">You received this because a tournament organizer reached out via SquashStay.<br>Simply ignore this email if you're not interested.</p>
</body>
</html>`;
}
