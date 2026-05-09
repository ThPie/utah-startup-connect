import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { messages, query, resources } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY not configured");

    const resourceList = Array.isArray(resources) && resources.length > 0
      ? resources.map((r: any, i: number) => {
          const parts = [`${i + 1}. **${r.title}**`];
          if (r.description) parts.push(`   ${r.description}`);
          const tags: string[] = [];
          if (r.topics?.length) tags.push(`Topics: ${r.topics.join(", ")}`);
          if (r.industries?.length) tags.push(`Industries: ${r.industries.join(", ")}`);
          if (r.communities?.length) tags.push(`Communities: ${r.communities.join(", ")}`);
          if (r.locations?.length) tags.push(`Locations: ${r.locations.join(", ")}`);
          if (r.link) tags.push(`Link: ${r.link}`);
          if (r.email) tags.push(`Contact: ${r.email}`);
          if (tags.length) parts.push(`   (${tags.join(" | ")})`);
          return parts.join("\n");
        }).join("\n\n")
      : null;

    const sys = `You are the 5iO Navigator AI — Utah's startup ecosystem guide.

## FOUNDER PROFILE
"${query ?? "Not provided"}"

## MATCHED PROGRAMS (your only source of truth — never invent)
${resourceList ?? "No specific programs matched. Tell the user briefly to refine their search."}

## HOW TO ANSWER (STRICT)
Keep replies short and scannable. Format:

**Top pick: [Program Name]** — one sentence on why it fits this founder.

Also worth a look:
- **[Program Name]** — one sentence why.
- **[Program Name]** — one sentence why. (max 3 bullets total)

**Next step:** one concrete action with a link, e.g. "Apply at https://… " or "Email contact@…".

RULES:
- Maximum ~120 words. No long preambles. No "It sounds like you're looking for…".
- Only reference programs from the matched list. Use their exact names.
- Use markdown bold (**name**) for program names — do NOT bold whole sentences.
- If nothing in the list fits, say so in one sentence and suggest refining the search.
- Never use phrases like "Utah has a strong ecosystem of…". Get to the recommendation.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: sys }, ...messages],
      }),
    });

    if (r.status === 429)
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    if (r.status === 402)
      return new Response(JSON.stringify({ error: "Credits exhausted" }), {
        status: 402,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error", r.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(r.body, {
      headers: { ...cors, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
