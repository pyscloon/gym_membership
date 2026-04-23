import { supabase } from '../../../lib/supabaseClient';

const EVIDENCE_BUCKET = "uploads";

export function normalizeEvidencePath(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "false" || trimmed === "null" || trimmed === "undefined") {
    return null;
  }
  if (trimmed === "true") return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed.replace(new RegExp(`^${EVIDENCE_BUCKET}/`), "");

  try {
    const url = new URL(trimmed);
    const markers = [
      `/storage/v1/object/public/${EVIDENCE_BUCKET}/`,
      `/storage/v1/object/sign/${EVIDENCE_BUCKET}/`,
    ];

    for (const marker of markers) {
      const index = url.pathname.indexOf(marker);
      if (index >= 0) {
        return decodeURIComponent(url.pathname.slice(index + marker.length));
      }
    }

    if (url.pathname.includes(`/storage/v1/object/public/${EVIDENCE_BUCKET}/`)) {
      return decodeURIComponent(url.pathname.split(`/storage/v1/object/public/${EVIDENCE_BUCKET}/`).pop() ?? "");
    }
  } catch {
    return trimmed.replace(new RegExp(`^${EVIDENCE_BUCKET}/`), "");
  }

  return trimmed.replace(new RegExp(`^${EVIDENCE_BUCKET}/`), "");
}

export async function resolveEvidenceUrl(value?: string | null) {
  if (!value) return null;
  const normalizedPath = normalizeEvidencePath(value);
  if (!normalizedPath) return null;
  if (normalizedPath.startsWith("data:")) {
    return normalizedPath;
  }
  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }
  if (!supabase) return value;

  const path = normalizeEvidencePath(value);
  if (!path) return null;

  const { data: signedData, error: signedError } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(path, 60 * 60, { download: false });

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data } = supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function resolveLatestFolderEvidence(userId: string, prefix: string) {
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .list(userId, {
      limit: 20,
      offset: 0,
      sortBy: { column: "name", order: "desc" },
    });

  if (error || !data) return null;

  const match = data.find((item: { name: string }) => item.name.startsWith(prefix));
  if (!match) return null;

  return resolveEvidenceUrl(`${userId}/${match.name}`);
}

export async function resolveAnyFolderEvidence(userId: string, keywords: string[]) {
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .list(userId, {
      limit: 50,
      offset: 0,
      sortBy: { column: "name", order: "desc" },
    });

  if (error || !data) return null;

  const match = data.find((item: { name: string }) => {
    const lower = item.name.toLowerCase();
    return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
  });

  if (!match) return null;

  return resolveEvidenceUrl(`${userId}/${match.name}`);
}
