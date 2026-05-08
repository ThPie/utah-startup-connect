import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/map/add-company")({
  head: () => ({ meta: [{ title: "Submit a company — 5iO" }] }),
  component: AddCompany,
});

function AddCompany() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    website: "",
    description: "",
    sector: "Tech",
    stage: "Seed",
    full_address: "",
    year_founded: "",
    employee_count: "1-10",
    hiring_status: false,
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: form.name,
        website: form.website || null,
        description: form.description || null,
        sector: form.sector,
        stage: form.stage,
        full_address: form.full_address || null,
        year_founded: form.year_founded ? Number(form.year_founded) : null,
        employee_count: form.employee_count,
        hiring_status: form.hiring_status,
        status: "pending",
        submitted_by: user?.id ?? null,
      })
      .select()
      .single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted! We'll review it shortly.");
    nav({ to: "/map/company/$id", params: { id: data.id } });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        Add your company
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Submissions are reviewed before appearing on the public map.
      </p>
      <Card className="mt-8 p-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Company name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Website">
            <Input
              type="url"
              placeholder="https://"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </Field>
          <Field label="One-line description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sector">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
              >
                {["Tech", "Life Sciences", "Aerospace", "Energy", "Outdoor", "Manufacturing", "Other"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Stage">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
              >
                {["Idea", "Pre-seed", "Seed", "Series A", "Series B+", "Profitable"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City, State">
              <Input value={form.full_address} onChange={(e) => setForm({ ...form, full_address: e.target.value })} />
            </Field>
            <Field label="Year founded">
              <Input
                type="number"
                value={form.year_founded}
                onChange={(e) => setForm({ ...form, year_founded: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Team size">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.employee_count}
              onChange={(e) => setForm({ ...form, employee_count: e.target.value })}
            >
              {["1-10", "11-50", "51-200", "201-500", "500+"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.hiring_status}
              onChange={(e) => setForm({ ...form, hiring_status: e.target.checked })}
            />
            Currently hiring
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting…" : "Submit company"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}