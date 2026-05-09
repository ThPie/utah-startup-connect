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
import { ArrowLeft, Plus, X, Building2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
    linkedin_url: "",
    photo_urls: [""] as string[],
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Filter out empty photo URLs
    const photos = form.photo_urls.filter((u) => u.trim().length > 0);

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
        linkedin_url: form.linkedin_url || null,
        photos: photos.length > 0 ? photos : null,
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

  const addPhotoField = () => {
    if (form.photo_urls.length >= 6) return;
    setForm({ ...form, photo_urls: [...form.photo_urls, ""] });
  };

  const removePhotoField = (idx: number) => {
    setForm({
      ...form,
      photo_urls: form.photo_urls.filter((_, i) => i !== idx),
    });
  };

  const updatePhoto = (idx: number, val: string) => {
    const updated = [...form.photo_urls];
    updated[idx] = val;
    setForm({ ...form, photo_urls: updated });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        to="/map"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to map
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Add your company
          </h1>
          <p className="text-sm text-muted-foreground">
            Submissions are reviewed before appearing on the public map.
          </p>
        </div>
      </div>

      <Card className="mt-8 p-6">
        <form onSubmit={submit} className="space-y-5">
          {/* ─── Basic Info ──── */}
          <div
            className="text-xs font-semibold uppercase tracking-widest text-primary"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Basic Information
          </div>

          <Field label="Company name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Your startup name"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Website">
              <Input
                type="url"
                placeholder="https://example.com"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </Field>
            <Field label="LinkedIn">
              <Input
                type="url"
                placeholder="https://linkedin.com/company/..."
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              />
            </Field>
          </div>

          <Field label="One-line description">
            <Textarea
              rows={3}
              placeholder="What does your company do?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          {/* ─── Company Details ──── */}
          <div
            className="mt-2 text-xs font-semibold uppercase tracking-widest text-primary"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Company Details
          </div>

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
              <Input
                placeholder="Salt Lake City, UT"
                value={form.full_address}
                onChange={(e) => setForm({ ...form, full_address: e.target.value })}
              />
            </Field>
            <Field label="Year founded">
              <Input
                type="number"
                placeholder="2024"
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
              className="rounded"
            />
            Currently hiring
          </label>

          {/* ─── Photo Gallery ──── */}
          <div
            className="mt-2 text-xs font-semibold uppercase tracking-widest text-primary"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Photo Gallery
          </div>
          <p className="text-xs text-muted-foreground">
            Add up to 6 image URLs showcasing your team, office, or product.
          </p>

          <div className="space-y-2">
            {form.photo_urls.map((url, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder="https://example.com/photo.jpg"
                  value={url}
                  onChange={(e) => updatePhoto(idx, e.target.value)}
                />
                {form.photo_urls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removePhotoField(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {form.photo_urls.length < 6 && (
              <Button type="button" variant="ghost" size="sm" onClick={addPhotoField}>
                <Plus className="mr-1 h-3 w-3" /> Add another photo
              </Button>
            )}
          </div>

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