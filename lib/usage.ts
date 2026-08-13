import { createServiceSupabase } from "./supabaseClient";
import { PLANS, type PlanId } from "./pricing";

export async function getPlan(userId: string): Promise<PlanId> {
  const supabase = createServiceSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  return (data?.plan as PlanId) || "free";
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export async function checkAndConsumeUsage(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  plan: PlanId;
}> {
  const supabase = createServiceSupabase();
  const day = todayKey();
  const plan = await getPlan(userId);
  const dailyLimit = PLANS[plan].dailyLimit;

  const { data: usageRow } = await supabase
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();

  const currentCount = usageRow?.count ?? 0;

  if (currentCount >= dailyLimit) {
    return { allowed: false, remaining: 0, plan };
  }

  // Prefer the atomic increment_usage() Postgres function (see supabase/schema.sql)
  // over this read-then-write once you have concurrent traffic.
  const { error } = await supabase
    .from("usage")
    .upsert(
      { user_id: userId, day, count: currentCount + 1 },
      { onConflict: "user_id,day" }
    );

  if (error) throw error;

  return { allowed: true, remaining: dailyLimit - (currentCount + 1), plan };
}
