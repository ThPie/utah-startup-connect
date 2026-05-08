import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, MapPin, Briefcase, ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/map/company/$id")({
  component: CompanyPage,
});

function CompanyPage() {
  const { id } = useParams({ from: "/map/company/$id" });
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("companies").select("*").eq("id", id).maybeSingle(),
      supabase.from("job_postings").select("*").eq("company_id", id).eq("is_active", true),
    ]).then(([c, j]) => {
      setCompany(c.data);
      setJobs(j.data ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="mx-auto max-w-4xl p-12 text-muted-foreground">Loading…</div>;
  if (!company) return <div className="mx-auto max-w-4xl p-12">Company not found.</div>;

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      <Link to="/map" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to map
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
            {company.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {company.sector && <Badge variant="secondary">{company.sector}</Badge>}
            {company.stage && <Badge variant="outline">{company.stage}</Badge>}
            {company.is_verified && (
              <Badge variant="default">
                <Shield className="mr-1 h-3 w-3" /> Verified
              </Badge>
            )}
            {company.hiring_status && (
              <Badge>
                <Briefcase className="mr-1 h-3 w-3" /> Hiring
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer">
              <Button variant="outline">
                Website <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          )}
          {!company.is_claimed && user && (
            <Link to="/map/claim/$id" params={{ id }}>
              <Button>Claim this listing</Button>
            </Link>
          )}
        </div>
      </div>

      {company.description && <p className="mt-6 text-lg text-foreground/80">{company.description}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {company.full_address && (
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location" value={company.full_address} />
        )}
        {company.year_founded && <InfoRow label="Founded" value={String(company.year_founded)} />}
        {company.employee_count && <InfoRow label="Team size" value={company.employee_count} />}
        {company.linkedin_url && (
          <InfoRow
            label="LinkedIn"
            value={
              <a href={company.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                View profile
              </a>
            }
          />
        )}
      </div>

      <h2 className="mt-12 text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        Open roles
      </h2>
      {jobs.length === 0 ? (
        <p className="mt-2 text-muted-foreground">No active job postings.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {jobs.map((j) => (
            <Card key={j.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{j.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {[j.type, j.location].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {j.url && (
                  <a href={j.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      Apply <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </article>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-accent)" }}>
        {label}
      </p>
      <p className="mt-1 flex items-center gap-2 font-medium">
        {icon}
        {value}
      </p>
    </Card>
  );
}