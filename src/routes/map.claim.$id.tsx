import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { submitClaim } from "@/lib/claims.functions";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/map/claim/$id")({
  component: ClaimPage,
});

function ClaimPage() {
  const { id } = useParams({ from: "/map/claim/$id" });
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [success, setSuccess] = useState<{ autoVerified: boolean; companyName: string } | null>(null);
  const submitFn = useServerFn(submitClaim);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    supabase.from("companies").select("name").eq("id", id).maybeSingle().then(({ data }) => setCompany(data));
  }, [id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const res = await submitFn({ data: { companyId: id, email, message } });
      setSuccess({ autoVerified: res.autoVerified, companyName: res.companyName });
      if (res.autoVerified) {
        toast.success("Auto-verified — you now own this listing.");
      } else {
        toast.success("Claim submitted. We'll review and respond shortly.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong submitting your claim.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <Card className="p-8">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${success.autoVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {success.autoVerified ? <ShieldCheck className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {success.autoVerified ? "Auto-verified ✨" : "Claim submitted"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {success.autoVerified
                  ? `Your email matches the ${success.companyName} domain — you can now edit this listing immediately.`
                  : `Your claim for ${success.companyName} is in review. We'll email you once an admin approves it (usually within 24 hours).`}
              </p>
              <div className="mt-6 flex gap-2">
                <Link to="/map/company/$id" params={{ id }}>
                  <Button>{success.autoVerified ? "Manage listing" : "Back to company"}</Button>
                </Link>
                <Link to="/map">
                  <Button variant="ghost">Back to map</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        Claim {company?.name ?? "this listing"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use a work email at this company. If your email domain matches the company website, you'll be auto-verified instantly — otherwise an admin will review.
      </p>
      <Card className="mt-6 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Work email at this company</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Your role / context</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting…" : "Submit claim"}
          </Button>
        </form>
      </Card>
      <Link to="/map/company/$id" params={{ id }} className="mt-4 inline-block text-sm text-muted-foreground hover:text-primary">
        ← Back to company
      </Link>
    </div>
  );
}