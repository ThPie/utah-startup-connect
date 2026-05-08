import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/SiteNav";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Utah Startup Map — 5iO" },
      { name: "description", content: "Explore 222+ verified Utah startups across 7 sectors." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background" style={{ fontFamily: "var(--font-body)" }}>
      <SiteNav />
      <Outlet />
      <SiteFooter />
    </div>
  ),
});