import { QRCodeSVG } from "qrcode.react";
import MembershipDashboard from "../components/MembershipDashboard";
import CrowdEstimationPanel from "../components/CrowdEstimationPanel";
import { DataCard, FadeInSection, PageHeader } from "../components/ui";
import AppTopBar from "../components/ui/AppTopBar";
import { encodeQrPayload } from "../lib/qrPayload";

export default function WalkInPage() {
  const walkInQR = encodeQrPayload({
    type: "walk_in",
    date: new Date().toISOString().split("T")[0],
    access: "day-pass",
  });

  return (
    <div className="min-h-screen w-full bg-[#EEEEEE]">
      <AppTopBar />
      <main className="mx-auto w-full max-w-7xl px-6 pb-10 pt-28 sm:px-10 lg:px-14">
        {/* Section 1 — Walk-In Header */}
        <FadeInSection>
          <PageHeader
            eyebrow="Guest Access"
            title="Walk-In Pass"
            subtitle="Get instant access with a one-day pass and show your branded QR code at the front desk."
          />
        </FadeInSection>

        {/* Section 2 — Walk-In Utility Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          <DataCard title="Guest Pass QR Code">
            <div className="mt-4 flex items-center justify-center rounded-xl border border-[rgba(0,102,204,0.2)] bg-[rgba(0,102,204,0.04)] p-6">
              <QRCodeSVG value={walkInQR} size={220} bgColor="#ffffff" fgColor="#000033" level="M" />
            </div>
            <p className="mt-3 text-sm text-[#555555] [font-family:var(--font-body)]">
              Valid for {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </DataCard>

          <DataCard title="Current Crowd Estimate">
            <CrowdEstimationPanel />
          </DataCard>
        </div>

        {/* Section 3 — Membership Module */}
        <FadeInSection className="mt-6">
          <DataCard className="p-0">
            <MembershipDashboard />
          </DataCard>
        </FadeInSection>
      </main>
    </div>
  );
}
