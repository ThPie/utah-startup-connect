import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";
const CAREER_HINTS = ["career", "careers", "jobs", "join", "hiring", "work-with-us", "work_with_us", "team", "open-roles", "openings"];

type Job = { title: string; location?: string; type?: string; url?: string };

async function findCareersUrl(site: string, key: string): Promise<string | null> {
  try {
    const r = await fetch(`${FIRECRAWL}/map`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: site, search: "careers jobs hiring", limit: 50, includeSubdomains: true }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const links: string[] = j.links ?? j.data?.links ?? [];
    if (!links.length) return null;
    const ranked = links
      .map((u) => {
        const lower = u.toLowerCase();
        const score = CAREER_HINTS.reduce((s, h) => s + (lower.includes(h) ? 1 : 0), 0);
        return { u, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.u ?? null;
  } catch {
    return null;
  }
}

async function scrapeJobs(url: string, key: string): Promise<{ is_hiring: boolean; jobs: Job[] } | null> {
  try {
    const r = await fetch(`${FIRECRAWL}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: [
          {
            type: "json",
            prompt:
              "Extract whether this company is currently hiring and a list of open job postings on this page. Return is_hiring as boolean and a jobs array with title, optional location, optional type (full-time/part-time/contract/intern), and optional url (the application or job-detail link).",
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
                    required: ["title"],
                  },
                },
              },
              required: ["is_hiring", "jobs"],
            },
          },
        ],
        onlyMainContent: true,
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const data = j.data ?? j;
    const out = data.json ?? data.extract ?? null;
    if (!out) return null;
    return {
      is_hiring: !!out.is_hiring || (Array.isArray(out.jobs) && out.jobs.length > 0),
      jobs: Array.isArray(out.jobs) ? out.jobs.slice(0, 25) : [],
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const FC = Deno.env.get("FIRECRAWL_API_KEY");
    const SUPA_URL = Deno.env.get("SUPABASE_URL");
    const SUPA_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!FC) throw new Error("FIRECRAWL_API_KEY missing");
    if (!SUPA_URL || !SUPA_SERVICE) throw new Error("Supabase env missing");

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Math.max(Number(body.limit) || 15, 1), 40);
    const onlyId: string | undefined = body.companyId;

    const admin = createClient(SUPA_URL, SUPA_SERVICE);

    let q = admin
      .from("companies")
      .select("id, name, website")
      .eq("status", "active")
      .not("website", "is", null);
    if (onlyId) q = q.eq("id", onlyId);
    else q = q.order("updated_at", { ascending: true }).limit(limit);

    const { data: companies, error } = await q;
    if (error) throw error;

    let scanned = 0;
    let hiring = 0;
    let jobsImported = 0;
    const errors: string[] = [];

    for (const c of companies ?? []) {
      scanned++;
      try {
        const careers = (await findCareersUrl(c.website, FC)) ?? c.website;
        const result = await scrapeJobs(careers, FC);
        const isHiring = !!result?.is_hiring;
        const jobs = result?.jobs ?? [];

        await admin
          .from("companies")
          .update({ hiring_status: isHiring, updated_at: new Date().toISOString() })
          .eq("id", c.id);

        await admin.from("job_postings").delete().eq("company_id", c.id).eq("ai_imported", true);

        if (jobs.length) {
          const rows = jobs
            .filter((j) => j.title && j.title.trim())
            .map((j) => ({
              company_id: c.id,
              title: j.title.slice(0, 200),
              location: j.location?.slice(0, 200) ?? null,
              type: j.type?.slice(0, 50) ?? null,
              url: j.url ?? careers,
              ai_imported: true,
              is_active: true,
            }));
          if (rows.length) {
            const { error: insErr } = await admin.from("job_postings").insert(rows);
            if (!insErr) jobsImported += rows.length;
          }
        }

        if (isHiring) hiring++;
      } catch (e) {
        errors.push(`${c.name}: ${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({ scanned, hiring, jobs_imported: jobsImported, errors }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});