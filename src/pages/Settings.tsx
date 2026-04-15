import { useState } from "react";
import { DataCard, FadeInSection, PageHeader, PrimaryButton, SecondaryButton, StatPill } from "../components/ui";

export default function SettingsPage() {
  const [alerts, setAlerts] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  return (
    <>
      <FadeInSection>
        <PageHeader
          eyebrow="Preferences"
          title="Account Settings"
          subtitle="Control notifications, communication, and account defaults with a clean and consistent brand-driven settings experience."
        />
      </FadeInSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataCard title="Notifications">
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-[rgba(0,0,51,0.08)] p-4">
              <span className="text-sm [font-family:var(--font-body)] text-[#555555]">Training reminders</span>
              <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-[rgba(0,0,51,0.08)] p-4">
              <span className="text-sm [font-family:var(--font-body)] text-[#555555]">News and promos</span>
              <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
            </label>
          </div>
        </DataCard>

        <DataCard title="Security">
          <div className="mt-4 space-y-3">
            <input className="fr-input w-full" placeholder="Current password" type="password" />
            <input className="fr-input w-full" placeholder="New password" type="password" />
            <input className="fr-input w-full" placeholder="Confirm new password" type="password" />
            <div className="mt-2 flex gap-3">
              <PrimaryButton type="button">Save Changes</PrimaryButton>
              <SecondaryButton type="button" className="border-[rgba(0,0,51,0.2)] text-[#000033] hover:text-[#0099FF]">
                Reset
              </SecondaryButton>
            </div>
          </div>
        </DataCard>
      </div>

      <FadeInSection className="mt-6">
        <DataCard title="Account Snapshot">
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatPill value="Enabled" label="2FA" />
            <StatPill value="Monthly" label="Membership" />
            <StatPill value="3" label="Active Devices" />
          </div>
        </DataCard>
      </FadeInSection>
    </>
  );
}
