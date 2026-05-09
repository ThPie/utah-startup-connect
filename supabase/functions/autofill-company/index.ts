import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Official company name" },
    description: { type: "string", description: "One-line description of what the company does (max 200 chars)" },
    sector: {
      type: "string",
      enum: ["Tech", "Life Sciences", "Aerospace", "Energy", "Outdoor", "Manufacturing", "Other"],
    },
    stage: {
      type: "string",
      enum: ["Idea", "Pre-seed", "Seed", "Series A", "Series B+", "Profitable"],
    },
    full_address: { type: "string", description: "City, State (US format, e.g. 'Salt Lake City, UT')" },
    year_founded: { type: "number" },
    employee_count: {
      type: "string",
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
    },
    linkedin_url: { type: "string" },
    hiring_status: { type: "boolean" },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { input } = await req.json();
    if (!input || typeof input !== "string") throw new Error("Provide a company name or website");

    const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FC_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    let url = input.trim();
    const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(url) || /\.[a-z]{2,}(\/|$)/i.test(url);

    // If not a URL, search for the company website first
    if (!looksLikeUrl) {
      const searchRes = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: `${url} company official website`, limit: 3 }),
      });
      const searchData = await searchRes.json();
      const first = searchData?.data?.web?.[0] ?? searchData?.data?.[0];
      if (!first?.url) throw new Error(`Couldn't find a website for "${input}"`);
      url = first.url;
    } else if (!/^https?:\/\//i.test(url)) {
      url = `https://${url.replace(/^www\./, "")}`;
    }

    // Scrape with structured extraction
    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: [
          "markdown",
          {
            type: "json",
            schema: SCHEMA,
            prompt:
              "Extract company info. For sector pick the closest match. For stage estimate based on signals (team size, funding mentions, age). For employee_count estimate from team/about page. Only include fields you're confident about.",
          },
        ],
        onlyMainContent: true,
      }),
    });
    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) throw new Error(scrapeData?.error || "Scrape failed");

    const doc = scrapeData.data ?? scrapeData;
    const extracted = doc?.json ?? doc?.extract ?? {};
    const meta = doc?.metadata ?? {};

    const result = {
      name: extracted.name || meta.title?.split(/[|–\-—]/)[0]?.trim() || "",
      website: url,
      description: extracted.description || meta.description || "",
      sector: extracted.sector || "Tech",
      stage: extracted.stage || "Seed",
      full_address: extracted.full_address || "",
      year_founded: extracted.year_founded ?? "",
      employee_count: extracted.employee_count || "1-10",
      linkedin_url: extracted.linkedin_url || "",
      hiring_status: !!extracted.hiring_status,
    };

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("autofill-company error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});