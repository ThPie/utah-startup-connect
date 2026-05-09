import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CAREERS_HINTS = ["careers", "jobs", "join", "work-with-us", "hiring", "join-us", "work"];

type FCMapResp = { success: boolean; links?: (string | { url: string })[]; data?: { links?: string[] } };
type Job = { title?: string; location?: string; type?: string; url?: string };
type FCScrapeResp = {
  success: boolean;
  data?: { json?: { is_hiring?: boolean; jobs?: Job[] } };
  json?: { is_hiring?: boolean; jobs?: Job[] };
};

async function fcMap(website: string): Promise<string[]> {
  const r = await fetch("https://api.firecrawl.dev/v2/map", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: website, search: "careers jobs hiring", limit: 20 }),
  });
  if (!r.ok) throw new Error(`map ${r.status}`);
  const j = (await r.json()) as FCMapResp;
  const raw = j.links ?? j.data?.links ?? [];
  return raw.map((l) => (typeof l === "string" ? l : l.url)).filter(Boolean);
}

async function fcScrapeJson(url: string) {
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: [
        {
          type: "json",
          prompt:
            "Extract whether this company is currently hiring and list any open job postings on this page. Set is_hiring=true if any open roles are listed.",
          schema: {
            type: "object",
            properties: {
              is_hiring: { type: "boolean" },
              jobs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    location: { type: "string" },
                    type: { type: "string" },
                    url: { type: "string" },
                  },
                },
              },
            },
            required: ["is_hiring"],
          },
        },
      ],
      onlyMainContent: true,
    }),
  });
  if (!r.ok) throw new Error(`scrape ${r.status}`);
  const j = (await r.json()) as FCScrapeResp;
  return j.data?.json ?? j.json ?? { is_hiring: false, jobs: [] };
}

function pickCareers(links: string[], website: string): string {
  const lower = links.map((l) => ({ l, lc: l.toLowerCase() }));
  for (const hint of CAREERS_HINTS) {
    const hit = lower.find((x) => x.lc.includes(`/${hint}`));
    if (hit) return hit.l;
  }
  for (const hint of CAREERS_HINTS) {
    const hit = lower.find((x) => x.lc.includes(hint));
    if (hit) return hit.l;
  }
  return website;
}

async function processCompany(supa: any, c: { id: string; website: string; name: string }) {
  let links: string[] = [];
  try {
    links = await fcMap(c.website);
  } catch (_) {
    links = [];
  }
  const target = pickCareers(links, c.website);
  const data = await fcScrapeJson(target);
  const isHiring = !!data.is_hiring;
  const jobs = Array.isArray(data.jobs) ? data.jobs.filter((j) => j && j.title) : [];

  await supa.from("companies").update({ hiring_status: isHiring, updated_at: new Date().toISOString() }).eq("id", c.id);
  await supa.from("job_postings").delete().eq("company_id", c.id).eq("ai_imported", true);

  if (jobs.length > 0) {
    const rows = jobs.slice(0, 50).map((j) => ({
      company_id: c.id,
      title: (j.title || "").slice(0, 200),
      location: j.location?.slice(0, 200) ?? null,
      type: j.type?.slice(0, 80) ?? null,
      url: j.url?.slice(0, 1000) ?? null,
      ai_imported: true,
      is_active: true,
    }));
    await supa.from("job_postings").insert(rows);
  }
  return { isHiring, jobsCount: jobs.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth: require admin caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: roleRow } = await supa
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Optional ?limit=N to cap a run (saves Firecrawl credits during testing)
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 500;

  const { data: run } = await supa
    .from("hiring_refresh_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  const runId = run?.id;

  const { data: companies } = await supa
    .from("companies")
    .select("id, name, website")
    .eq("status", "active")
    .not("website", "is", null)
    .limit(limit);

  const list = (companies ?? []).filter((c) => c.website && /^https?:\/\//i.test(c.website));
  let scanned = 0;
  let hiring = 0;
  let jobsImported = 0;
  let errors = 0;

  // Sequential with small delay to stay within Firecrawl rate limits.
  for (const c of list) {
    try {
      const res = await processCompany(supa, c as any);
      scanned++;
      if (res.isHiring) hiring++;
      jobsImported += res.jobsCount;
    } catch (e) {
      errors++;
      console.error("company failed", c.name, e);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const summary = {
    scanned,
    hiring,
    jobs_imported: jobsImported,
    error_count: errors,
    status: errors > 0 && scanned === 0 ? "failed" : "success",
    finished_at: new Date().toISOString(),
  };

  if (runId) {
    await supa.from("hiring_refresh_runs").update(summary).eq("id", runId);
  }

  return new Response(JSON.stringify({ ok: true, ...summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});