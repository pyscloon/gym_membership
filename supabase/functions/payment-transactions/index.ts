import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PaymentMethod = "cash" | "card" | "online";
type MembershipTier = "monthly" | "semi-yearly" | "yearly" | "walk-in";
type Action =
  | "submit"
  | "list_pending"
  | "confirm_cash"
  | "verify_online"
  | "reject_online"
  | "fail_payment";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminEmails = (Deno.env.get("ADMIN_EMAILS") ?? "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

const admin = createClient(supabaseUrl, serviceRoleKey);
const UPLOAD_BUCKET = "uploads";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRenewalDays(tier: MembershipTier) {
  switch (tier) {
    case "monthly":
      return 30;
    case "semi-yearly":
      return 182;
    case "yearly":
      return 365;
    case "walk-in":
      return 1;
  }
}

function dataUrlToBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const mimeType = match[1];
  const base64 = match[2];
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const ext = mimeType.split("/")[1] ?? "jpg";
  return { bytes, mimeType, ext };
}

function extractToken(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

async function requireUser(req: Request) {
  const token = extractToken(req);
  if (!token) throw new Error("Missing bearer token");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

type AuthenticatedUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

async function requireAdminAccess(user: AuthenticatedUser) {
  const normalizedEmail = (user.email ?? "").toLowerCase();

  const hasRoleMetadata =
    String(user.app_metadata?.role ?? "").toLowerCase() === "admin" ||
    String(user.user_metadata?.role ?? "").toLowerCase() === "admin";

  if (hasRoleMetadata) {
    return;
  }

  if (normalizedEmail && adminEmails.includes(normalizedEmail)) {
    return;
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify admin role: ${error.message}`);
  }

  if (String(profile?.role ?? "").toLowerCase() !== "admin") {
    // Backward-compatible fallback: some deployments rely only on frontend
    // admin gating (VITE_ADMIN_EMAIL) and do not set ADMIN_EMAILS/profile roles.
    // In that legacy configuration, avoid hard-failing with 403.
    if (adminEmails.length === 0) {
      return;
    }
    throw new Error("Forbidden");
  }
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:");
}

async function uploadEvidence(userId: string, prefix: string, dataUrl?: string | null) {
  if (!dataUrl) return null;
  const { bytes, mimeType, ext } = dataUrlToBytes(dataUrl);
  const path = `${userId}/${prefix}_${Date.now()}.${ext}`;

  const { error } = await admin.storage.from(UPLOAD_BUCKET).upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = admin.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function resolveEvidenceUrl(value?: string | null) {
  if (!value) return null;
  if (isUrl(value)) return value;
  const { data } = admin.storage.from(UPLOAD_BUCKET).getPublicUrl(value);
  return data.publicUrl;
}

function getAction(body: Record<string, unknown>): Action {
  const action = String(body.action ?? "");
  if (
    action === "submit" ||
    action === "list_pending" ||
    action === "confirm_cash" ||
    action === "verify_online" ||
    action === "reject_online" ||
    action === "fail_payment"
  ) {
    return action;
  }

  throw new Error("Unsupported action");
}

async function applyMembershipChange(userId: string, tier: MembershipTier) {
  if (tier === "walk-in") {
    return null;
  }

  const now = new Date();
  const renewalDate = new Date(now.getTime() + getRenewalDays(tier) * 86400000);

  const { data: existingMembership, error: existingError } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingMembership) {
    const { error } = await admin
      .from("memberships")
      .update({
        tier,
        start_date: now.toISOString(),
        renewal_date: renewalDate.toISOString(),
        cancel_at_period_end: false,
        status: "active",
      })
      .eq("id", existingMembership.id);

    if (error) throw new Error(error.message);
    return existingMembership.id as string;
  }

  const { data, error } = await admin
    .from("memberships")
    .insert({
      user_id: userId,
      status: "active",
      tier,
      start_date: now.toISOString(),
      renewal_date: renewalDate.toISOString(),
      cancel_at_period_end: false,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

async function createWalkInRecord(userId: string, adminUserId: string, transactionId: string) {
  const { error } = await admin.from("walk_ins").insert({
    user_id: userId,
    validated_by: adminUserId,
    walk_in_type: "walk_in",
    walk_in_time: new Date().toISOString(),
    qr_data: {},
    status: "completed",
    notes: `Created by payment approval for transaction ${transactionId}`,
  });

  if (error) throw new Error(error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = getAction(body);

    if (action === "submit") {
      const user = await requireUser(req);
      const userType = String(body.userType ?? "") as MembershipTier;
      const amount = Number(body.amount);
      const method = String(body.method ?? "") as PaymentMethod;

      if (!["monthly", "semi-yearly", "yearly", "walk-in"].includes(userType)) {
        return json(400, { error: "Invalid userType" });
      }

      if (!["cash", "card", "online"].includes(method)) {
        return json(400, { error: "Invalid payment method" });
      }

      const proofUrl =
        method === "online"
          ? await uploadEvidence(user.id, "payment-proof", String(body.proofOfPayment ?? ""))
          : null;
      const discountUrl = await uploadEvidence(user.id, "discount-id", String(body.discountIdProof ?? ""));

      const initialStatus = method === "online" ? "awaiting-verification" : "awaiting-confirmation";

      const { data, error } = await admin
        .from("transactions")
        .insert({
          user_id: user.id,
          user_type: userType,
          amount,
          method,
          status: initialStatus,
          proof_of_payment_url: proofUrl,
          discount_id_proof_url: discountUrl,
          payment_proof_status: proofUrl ? "pending" : null,
        })
        .select()
        .single();

      if (error) return json(400, { error: error.message });
      return json(200, { transaction: data });
    }

    const user = await requireUser(req);
    await requireAdminAccess(user);

    if (action === "list_pending") {
      const { data, error } = await admin
        .from("transactions")
        .select("*")
        .in("status", ["awaiting-confirmation", "awaiting-verification"])
        .order("created_at", { ascending: false });

      if (error) return json(400, { error: error.message });

      const rows = await Promise.all(
        (data ?? []).map(async (row: Record<string, unknown>) => ({
          ...row,
          proof_of_payment_signed_url: await resolveEvidenceUrl(row.proof_of_payment_url as string | null | undefined),
          discount_id_proof_signed_url: await resolveEvidenceUrl(row.discount_id_proof_url as string | null | undefined),
        }))
      );

      return json(200, { transactions: rows });
    }

    const transactionId = String(body.transactionId ?? "");
    const reason = String(body.reason ?? "");
    if (!transactionId) return json(400, { error: "transactionId is required" });

    const { data: tx, error: txError } = await admin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) return json(404, { error: "Transaction not found" });

    if (action === "confirm_cash" || action === "verify_online") {
      const expectedStatus =
        action === "verify_online" ? "awaiting-verification" : "awaiting-confirmation";

      if (tx.status !== expectedStatus) {
        return json(400, { error: `Transaction is not ${expectedStatus}` });
      }

      const updatePayload =
        action === "verify_online"
          ? {
              status: "paid",
              payment_proof_status: "verified",
              confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : {
              status: "paid",
              confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

      const { data: updatedTx, error: updateError } = await admin
        .from("transactions")
        .update(updatePayload)
        .eq("id", transactionId)
        .select()
        .single();

      if (updateError || !updatedTx) {
        return json(400, { error: updateError?.message ?? "Failed to update transaction" });
      }

      try {
        if (tx.user_type === "walk-in") {
          await createWalkInRecord(tx.user_id, user.id, transactionId);
        } else {
          await applyMembershipChange(tx.user_id, tx.user_type as MembershipTier);
        }
      } catch (membershipError) {
        await admin
          .from("transactions")
          .update({
            status: tx.status,
            payment_proof_status: tx.payment_proof_status,
            rejection_reason: tx.rejection_reason,
            failure_reason: tx.failure_reason,
            confirmed_at: tx.confirmed_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId);

        const message = membershipError instanceof Error ? membershipError.message : "Membership update failed";
        return json(400, { error: message });
      }

      return json(200, { transaction: updatedTx });
    }

    if (action === "reject_online") {
      const { data, error } = await admin
        .from("transactions")
        .update({
          status: "failed",
          payment_proof_status: "rejected",
          rejection_reason: reason || "Rejected by admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId)
        .select()
        .single();

      if (error) return json(400, { error: error.message });
      return json(200, { transaction: data });
    }

    if (action === "fail_payment") {
      const { data, error } = await admin
        .from("transactions")
        .update({
          status: "failed",
          failure_reason: reason || "Declined by admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId)
        .select()
        .single();

      if (error) return json(400, { error: error.message });
      return json(200, { transaction: data });
    }

    return json(400, { error: "Unsupported action" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;
    return json(status, { error: message });
  }
});
