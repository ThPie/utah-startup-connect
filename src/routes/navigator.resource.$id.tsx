import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/navigator/resource/$id")({
  head: () => ({
    meta: [
      { title: "Program details — 5iO Navigator" },
      { name: "description", content: "Details for a Utah founder resource." },
    ],
  }),
  component: ResourceDetail,
});

const KEY = "5io.navigator.v1";

function hashHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function ResourceDetail() {
  const { id } = Route.useParams();
  const [r, setR] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase
      .from("resources")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) toast.error(error.message);
        
        if (data) {
          setR(data);
          // Calculate personalized match reasons
          try {
            const saved = JSON.parse(localStorage.getItem(KEY) || "null");
            if (saved && saved.quiz) {
              const matched = getReasons(data, saved.quiz);
              setReasons(matched);
            }
          } catch (e) {
            console.error("Failed to load quiz for reasons", e);
          }
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "var(--font-body)" }}>
      <SiteNav />
      
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          to="/navigator"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Navigator
        </Link>

        {loading ? (
          <div className="mt-16 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="animate-pulse">Loading program details...</p>
          </div>
        ) : !r ? (
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold">Program not found.</h2>
            <p className="mt-2 text-muted-foreground">It may have been moved or removed.</p>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
            <article>
              <div
                className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl shadow-2xl shadow-primary/5"
                style={
                  r.image_url
                    ? undefined
                    : {
                        background: `linear-gradient(135deg, hsl(${hashHue(r.id)} 65% 55%), hsl(${(hashHue(r.id) + 40) % 360} 70% 40%))`,
                      }
                }
              >
                {r.image_url ? (
                  <img src={r.image_url} alt={r.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-8xl font-bold text-white/20 select-none">
                    {r.title?.substring(0, 2).toUpperCase()}
                  </div>
                )}
                {/* Personalized Badge */}
                {reasons.length > 0 && (
                  <div className="absolute top-4 left-4 rounded-full bg-primary/90 text-primary-foreground px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-xl border border-white/20">
                    Personalized Match
                  </div>
                )}
              </div>

              <div className="mt-10">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {r.is_active ? (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Program
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                  {r.type && <Badge variant="outline" className="border-border/50 text-muted-foreground">{r.type}</Badge>}
                </div>

                <h1 className="text-4xl font-bold md:text-6xl leading-[1.1]" style={{ fontFamily: "var(--font-display)" }}>
                  {r.title}
                </h1>

                {reasons.length > 0 && (
                  <div className="mt-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                    <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">Why this matched your profile</p>
                    <div className="flex flex-wrap gap-2">
                      {reasons.map((reason, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl text-xs font-medium text-foreground shadow-sm border border-primary/10">
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 prose prose-slate prose-invert max-w-none">
                  {r.description && (
                    <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground/90">
                      {r.description}
                    </p>
                  )}
                </div>

                <div className="mt-12 grid gap-8 sm:grid-cols-2">
                  <TagSection title="Core Topics" items={r.topics} />
                  <TagSection title="Target Industries" items={r.industries} />
                  <TagSection title="Community Focus" items={r.communities} />
                  <TagSection title="Regional Access" items={r.locations} />
                </div>
              </div>
            </article>

            <aside className="space-y-6">
              <div className="sticky top-24 space-y-6">
                <Card className="p-6 rounded-3xl border-border/50 bg-card/50 backdrop-blur-sm">
                  <h3 className="font-bold text-lg mb-4" style={{ fontFamily: "var(--font-display)" }}>Get Access</h3>
                  <div className="space-y-3">
                    {r.link && (
                      <Button className="w-full h-12 rounded-2xl text-base font-bold shadow-lg shadow-primary/20" asChild>
                        <a href={r.link} target="_blank" rel="noreferrer">
                          Apply Now <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {r.email && (
                      <Button variant="outline" className="w-full h-12 rounded-2xl border-border/50 hover:bg-muted/50" asChild>
                        <a href={`mailto:${r.email}`}>
                          <Mail className="mr-2 h-4 w-4" /> Email Program
                        </a>
                      </Button>
                    )}
                  </div>
                  <p className="mt-4 text-[10px] text-center text-muted-foreground uppercase tracking-widest leading-relaxed">
                    Mentions of 5iO Navigator help speed up verification.
                  </p>
                </Card>

                {r.full_address && (
                  <Card className="p-6 rounded-3xl border-border/50 bg-muted/20">
                    <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">Location</h3>
                    <p className="text-sm leading-relaxed">{r.full_address}</p>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.full_address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
                    >
                      Open in Maps →
                    </a>
                  </Card>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function getReasons(r: any, q: any) {
  const reasons: string[] = [];
  const tokenize = (s?: string) =>
    (s || "")
      .toLowerCase()
      .split(/[\s/,&]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2 && !["the", "and", "for", "any", "other"].includes(t));

  const needTokens = (q.needs || []).flatMap(tokenize);
  const industryTokens = tokenize(q.industry);
  const locationTokens = tokenize(q.location);
  const communityTokens = q.community && q.community !== "Any" ? tokenize(q.community) : [];

  const arrHas = (arr: string[] | undefined, tokens: string[]) => {
    if (!arr || !tokens.length) return false;
    const joined = arr.join(" ").toLowerCase();
    return tokens.some((t) => joined.includes(t));
  };

  if (arrHas(r.locations, locationTokens)) reasons.push("📍 Near you");
  if (communityTokens.length && arrHas(r.communities, communityTokens)) reasons.push(`👥 ${q.community} founders`);
  if (arrHas(r.industries, industryTokens)) reasons.push("🏭 Industry match");
  if (arrHas(r.topics, needTokens)) reasons.push("🎯 Matches your needs");
  
  return reasons;
}

function TagSection({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.2em] text-primary/70 font-bold mb-3"
        style={{ fontFamily: "var(--font-accent)" }}
      >
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px] bg-muted/50 text-muted-foreground border-none hover:bg-muted transition-colors">
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}