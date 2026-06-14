import { createFileRoute } from "@tanstack/react-router";
import { SuperadminShell } from "@/components/superadmin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/Superadmin/settings")({
  head: () => ({ meta: [{ title: "Settings - Factrova Super Admin" }] }),
  component: SuperAdminSettings,
});

function SuperAdminSettings() {
  return (
    <SuperadminShell title="Settings">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Platform settings</h2>
        <p className="text-sm text-slate-300">Configure global defaults and security settings.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardContent className="p-6">
            <h3 className="font-semibold">Access control</h3>
            <p className="mt-2 text-sm text-slate-300">Use backend roles to control super-admin permissions.</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5 text-white">
          <CardContent className="p-6">
            <h3 className="font-semibold">Billing provider</h3>
            <p className="mt-2 text-sm text-slate-300">Connect your payment provider for subscription collection.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button className="bg-white text-slate-950 hover:bg-slate-200">Save settings</Button>
      </div>
    </SuperadminShell>
  );
}
