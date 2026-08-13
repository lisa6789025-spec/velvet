import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/serverClient";
import { capturePayPalOrder, getPayPalOrder, type PayPalOrder } from "@/lib/paypal";

function firstCapture(order: PayPalOrder) {
  return order.purchase_units?.[0]?.payments?.captures?.[0];
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const orderId: string | undefined = body.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  // Already captured before (client retried, or double-click) — just confirm.
  const { data: existing } = await supabase
    .from("payments")
    .select("plan, status")
    .eq("user_id", user.id)
    .eq("paypal_order_id", orderId)
    .maybeSingle();

  if (existing && existing.status === "completed") {
    return NextResponse.json({ status: "completed", plan: existing.plan });
  }

  let order: PayPalOrder;
  try {
    order = await capturePayPalOrder(orderId);
  } catch {
    // Capture can fail if the order was already captured. In that case look it up.
    order = await getPayPalOrder(orderId);
  }

  const capture = firstCapture(order);
  if (!capture || capture.status !== "COMPLETED") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
  }

  const { data: pending } = await supabase
    .from("payments")
    .select("plan")
    .eq("paypal_order_id", orderId)
    .maybeSingle();

  const plan = pending?.plan;
  if (!plan) {
    return NextResponse.json({ error: "No matching order found" }, { status: 400 });
  }

  await supabase
    .from("payments")
    .update({
      status: "completed",
      amount: Number(capture.amount.value),
      updated_at: new Date().toISOString(),
    })
    .eq("paypal_order_id", orderId);

  await supabase
    .from("profiles")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ status: "completed", plan });
}
