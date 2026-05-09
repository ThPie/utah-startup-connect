import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Briefcase, ArrowRight, ExternalLink, Sparkles, Plus } from "lucide-react";

/* ─────── Navigator preview ─────── */
export function HomeNavigatorPreview() {
  const [resources, setResources] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("resources")
      .select("id, title, description, topics, industries, link")
      .eq("is_active", true)
      .limit(6)
      .then(({ data }) => setResources(data ?? []));
  }, []);
  return (
    <section id="navigator" className="bg-background py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Founder's Navigator"
          title="Find the right state program in 2 minutes."
          subtitle="An AI-guided quiz matches you with personalized programs from a curated library of 213+ Utah resources."
          cta={{ to: "/navigator", label: "Open Navigator quiz" }}
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.slice(0, 6).map((r) => (
            <Link
              key={r.id}
              to="/navigator/resource/$id"
              params={{ id: r.id }}
              className="group block"
            >
              <Card className="flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                <h3 className="line-clamp-2 text-base font-semibold group-hover:text-primary">{r.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(r.topics ?? []).slice(0, 2).map((t: string) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary">
                  Learn more <ArrowRight className="h-3 w-3" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
        {resources.length > 0 && (
          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link to="/navigator">View all resources →</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────── Map preview (companies grid) ─────── */
export function HomeMapPreview() {
  const [companies, setCompanies] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("companies")
      .select("id, name, sector, stage, full_address, website")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setCompanies(data ?? []));
  }, []);
  return (
    <section id="map" className="bg-muted/30 py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Utah Startup Map"
          title="250+ verified Utah startups, mapped."
          subtitle="Filter by sector, stage, or hiring status — and add your own company in 60 seconds."
          cta={{ to: "/map", label: "Open the full map" }}
          secondaryCta={{ to: "/map/add-company", label: "+ List my company", icon: <Plus className="h-3.5 w-3.5" /> }}
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {companies.map((c) => (
            <Link
              key={c.id}
              to="/map/company/$id"
              params={{ id: c.id }}
              className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="line-clamp-1 font-semibold group-hover:text-primary">{c.name}</h4>
                <Sparkles className="h-3 w-3 text-primary opacity-0 transition group-hover:opacity-100" />
              </div>
              {c.full_address && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> <span className="line-clamp-1">{c.full_address}</span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1">
                {c.sector && <Badge variant="secondary" className="text-[10px]">{c.sector}</Badge>}
                {c.stage && <Badge variant="outline" className="text-[10px]">{c.stage}</Badge>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── Events preview ─────── */
export function HomeEventsPreview() {
  const [events, setEvents] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, description, start_date, location_name, url, image_url, organizer")
      .eq("is_active", true)
      .gte("start_date", new Date().toISOString())
      .order("start_date", { ascending: true })
      .limit(4)
      .then(({ data }) => {
        setEvents(data ?? []);
        setLoaded(true);
      });
  }, []);
  return (
    <section id="events" className="bg-background py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Upcoming Events"
          title="Pitch nights, demo days, meetups."
          subtitle="Stay close to Utah's founders, mentors, and investors — IRL."
          cta={{ to: "/events", label: "Browse all events" }}
        />
        {loaded && events.length === 0 ? (
          <EmptyState
            title="No upcoming events listed yet."
            body="Hosting a pitch night, demo day, or meetup? Add it so Utah founders can find you."
            ctaLabel="Submit an event"
            ctaHref="mailto:hello@5io.utah.gov?subject=Submit%20a%20Utah%20startup%20event"
          />
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {events.map((e) => (
              <a
                key={e.id}
                href={e.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                  <Calendar className="h-3.5 w-3.5" />
                  {e.start_date ? new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBA"}
                </div>
                <h4 className="mt-2 line-clamp-2 text-base font-semibold group-hover:text-primary">{e.title}</h4>
                {e.location_name && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> <span className="line-clamp-1">{e.location_name}</span>
                  </p>
                )}
                {e.organizer && <p className="mt-2 text-xs text-muted-foreground">by {e.organizer}</p>}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────── Jobs preview ─────── */
export function HomeJobsPreview() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase
      .from("job_postings")
      .select("id, title, location, url, company_id")
      .eq("is_active", true)
      .limit(6)
      .then(async ({ data }) => {
        if (!data || data.length === 0) {
          setJobs([]);
          setLoaded(true);
          return;
        }
        const ids = Array.from(new Set(data.map((j: any) => j.company_id).filter(Boolean)));
        const { data: comps } = ids.length
          ? await supabase.from("companies").select("id, name, sector").in("id", ids)
          : { data: [] as any[] };
        const map = new Map((comps ?? []).map((c: any) => [c.id, c]));
        setJobs(
          data.map((j: any) => ({
            id: j.id,
            title: j.title,
            location: j.location,
            url: j.url,
            company: map.get(j.company_id)?.name ?? "Utah Startup",
            sector: map.get(j.company_id)?.sector,
          }))
        );
        setLoaded(true);
      });
  }, []);
  return (
    <section id="jobs" className="bg-muted/30 py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Hiring Now"
          title="Open roles at Utah startups."
          subtitle="Curated tech, design, and operator jobs across Silicon Slopes."
          cta={{ to: "/jobs", label: "View all jobs" }}
        />
        {loaded && jobs.length === 0 ? (
          <EmptyState
            title="No open roles listed yet."
            body="Hiring at your Utah startup? Get your roles in front of the local talent pool."
            ctaLabel="Post a job"
            ctaHref="mailto:hello@5io.utah.gov?subject=Post%20a%20Utah%20startup%20job"
          />
        ) : (
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {jobs.slice(0, 6).map((j) => (
            <a
              key={j.id}
              href={j.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-1 text-sm font-semibold group-hover:text-primary">{j.title}</h4>
                <p className="line-clamp-1 text-xs text-muted-foreground">{j.company}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="line-clamp-1">{j.location}</span>
                  {j.sector && <Badge variant="secondary" className="text-[10px]">{j.sector}</Badge>}
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────── shared header ─────── */
function EmptyState({ title, body, ctaLabel, ctaHref }: { title: string; body: string; ctaLabel: string; ctaHref: string }) {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <h4 className="text-lg font-semibold">{title}</h4>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <Button className="mt-5" asChild>
        <a href={ctaHref}>{ctaLabel}</a>
      </Button>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  cta,
  secondaryCta,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: { to: string; label: string };
  secondaryCta?: { to: string; label: string; icon?: React.ReactNode };
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
        <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        <p className="mt-3 text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {secondaryCta && (
          <Button variant="outline" size="sm" asChild>
            <Link to={secondaryCta.to as any}>
              {secondaryCta.icon}
              {secondaryCta.label}
            </Link>
          </Button>
        )}
        <Button size="sm" asChild>
          <Link to={cta.to as any}>
            {cta.label} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}