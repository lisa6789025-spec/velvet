import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/serverClient";
import { createPayPalOrder } from "@/lib/paypal";
import { isPaidPlan, PLANS } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = body.plan;
  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const { id } = await createPayPalOrder(plan);

    await supabase.from("payments").insert({
      user_id: user.id,
      paypal_order_id: id,
      plan,
      amount: PLANS[plan].price,
      currency: "USD",
      status: "pending",
    });

    return NextResponse.json({ id, plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
