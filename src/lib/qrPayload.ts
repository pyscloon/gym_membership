import type { QRData } from "./checkInService";

const QR_PREFIX = "FX1|";

export function encodeQrPayload(data: QRData): string {
  const params = new URLSearchParams();

  params.set("t", data.type);

  if (data.id) {
    params.set("i", data.id);
  }

  if (data.tier) {
    params.set("r", data.tier);
  }

  if (data.timestamp) {
    params.set("s", data.timestamp);
  }

  if (data.date) {
    params.set("d", data.date);
  }

  if (data.access) {
    params.set("a", data.access);
  }

  return `${QR_PREFIX}${params.toString()}`;
}

export function decodeQrPayload(rawValue: string): QRData {
  if (rawValue.startsWith(QR_PREFIX)) {
    const params = new URLSearchParams(rawValue.slice(QR_PREFIX.length));
    const type = normalizeQrType(params.get("t"));

    if (!type) {
      throw new Error("Invalid QR code format");
    }

    return {
      type,
      id: params.get("i") || undefined,
      tier: params.get("r") || undefined,
      timestamp: params.get("s") || undefined,
      date: params.get("d") || undefined,
      access: params.get("a") || undefined,
    };
  }

  const parsed = JSON.parse(rawValue) as Partial<QRData> & { type?: string };
  const type = normalizeQrType(parsed.type);

  if (!type) {
    throw new Error("Invalid QR code format");
  }

  return {
    ...parsed,
    type,
  };
}

function normalizeQrType(type: string | null | undefined): QRData["type"] | null {
  if (!type) {
    return null;
  }

  const normalized = type.trim().toLowerCase();

  if (normalized === "checkin" || normalized === "member-checkin") {
    return "checkin";
  }

  if (normalized === "checkout" || normalized === "member-checkout") {
    return "checkout";
  }

  if (normalized === "walk_in" || normalized === "walk-in" || normalized === "walkin") {
    return "walk_in";
  }

  return null;
}
