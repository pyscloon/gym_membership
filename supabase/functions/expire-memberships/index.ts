// @ts-check
// <reference lib="deno.window" />
// Supabase Edge Function: Expire Memberships
// This function runs daily via cron job to auto-expire memberships
// Deploy: supabase functions deploy expire-memberships

// Declare Deno for TypeScript - available at runtime in Supabase Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(
    handler: () => Response | Promise<Response>,
  ): void;
};

// @ts-expect-error - ESM import available at runtime in Deno environment
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async () => {
  try {
    console.log("Starting membership expiration check...");

    // Find all memberships that should be expired
    // Condition: renewal_date < NOW() AND cancel_at_period_end = true
    const now = new Date().toISOString();

    const { data: expiredMemberships, error: fetchError } = await supabase
      .from("memberships")
      .select("id, user_id, renewal_date")
      .eq("status", "active")
      .eq("cancel_at_period_end", true)
      .lt("renewal_date", now);

    if (fetchError) {
      console.error("Error fetching expired memberships:", fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: fetchError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const count = expiredMemberships?.length || 0;
    console.log(`Found ${count} memberships to expire`);

    if (count === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No memberships to expire",
          expiredCount: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update all expired memberships
    const membershipIds = expiredMemberships.map((membership: { id: string }) => membership.id);

    const { error: updateError, count: updatedCount } = await supabase
      .from("memberships")
      .update({
        status: "expired",
        updated_at: now,
      })
      .in("id", membershipIds);

    if (updateError) {
      console.error("Error updating memberships:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: updateError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Successfully expired ${updatedCount} memberships`);

    // Log the operation for audit purposes
    await supabase
      .from("membership_expiration_logs")
      .insert({
        expired_count: updatedCount,
        executed_at: now,
        status: "success",
      })
      .catch(() => {
        // Table might not exist, that's okay
        console.log("Membership logs table not available (optional)");
        return { error: null };
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully expired ${updatedCount} memberships`,
        expiredCount: updatedCount,
        timestamp: now,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in expire-memberships function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/* 
  DEPLOYMENT INSTRUCTIONS:
  
  1. Deploy this function:
     supabase functions deploy expire-memberships

  2. Set up daily cron job in Supabase Dashboard:
     - Go to Edge Functions
     - Find "expire-memberships" function
     - Click "Set up cron job"
     - Set cron expression: `0 2 * * *` (runs daily at 2 AM UTC)
     - Enable the cron job

  3. Or use SQL cron job (alternative):
     SELECT cron.schedule(
       'expire-memberships',
       '0 2 * * *',
       'SELECT net.http_post(url => ''https://YOUR_FUNCTION_URL/functions/v1/expire-memberships'')::int'
     );

  4. Test the function:
     supabase functions invoke expire-memberships --no-verify-jwt
*/
