import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import QRScanner from "../components/QRScanner";
import { DataCard, FadeInSection, PageHeader, StaggerContainer } from "../components/ui";
import { encodeQrPayload } from "../lib/qrPayload";

const sessionRows = [
  { id: "A-1001", date: "2026-04-08", type: "Check-In", status: "Completed" },
  { id: "A-1002", date: "2026-04-09", type: "Check-Out", status: "Completed" },
  { id: "A-1003", date: "2026-04-10", type: "Check-In", status: "Pending" },
];

export default function CheckInPage() {
  const qrValue = useMemo(
    () =>
      encodeQrPayload({
        id: "member-user-1",
        type: "checkin",
        timestamp: new Date().toISOString(),
      }),
    []
  );

  return (
    <>
      <FadeInSection>
        <PageHeader
          eyebrow="Access"
          title="Check-In and Scan"
          subtitle="Generate your QR code and use the scanner for seamless entry and exit sessions."
        />
      </FadeInSection>

      <StaggerContainer className="grid gap-6 lg:grid-cols-2">
        <DataCard title="Member QR">
          <div className="mt-4 flex items-center justify-center rounded-xl border border-[rgba(0,102,204,0.2)] bg-[rgba(0,102,204,0.04)] p-6">
            <QRCodeSVG value={qrValue} size={220} bgColor="#ffffff" fgColor="#000033" level="M" />
          </div>
          <p className="mt-3 text-sm text-[#555555] [font-family:var(--font-body)]">
            Valid for one active session. Present this to front desk on arrival.
          </p>
        </DataCard>

        <DataCard title="Scanner">
          <div className="mt-4 rounded-xl border border-[rgba(0,102,204,0.2)] p-4">
            <QRScanner
              onScanSuccess={() => undefined}
              onScanError={() => undefined}
            />
          </div>
        </DataCard>
      </StaggerContainer>

      <FadeInSection className="mt-6">
        <DataCard title="Session History">
          <div className="mt-4 overflow-x-auto">
            <table className="fr-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((row) => (
                  <tr key={row.id}>
                    <td className="[font-family:var(--font-label)] text-[#0066CC]">{row.id}</td>
                    <td className="text-[#555555]">{row.date}</td>
                    <td className="text-[#000033]">{row.type}</td>
                    <td>
                      <span className="rounded-md bg-[rgba(0,102,204,0.12)] px-3 py-1 text-xs [font-family:var(--font-label)] text-[#0066CC]">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataCard>
      </FadeInSection>
    </>
  );
}
