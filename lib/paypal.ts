// Server-side PayPal REST API helpers. Only import from API routes.
import { PLANS, isPaidPlan, type PlanId } from "./pricing";

const PAYPAL_API =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal token request failed: ${res.status}`);
  }

  const data = await res.json();
  // Refresh 5 minutes before expiry so a slow capture never hits an expired token.
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };
  return cachedToken.token;
}

export async function createPayPalOrder(plan: PlanId): Promise<{ id: string }> {
  if (!isPaidPlan(plan)) {
    throw new Error("Not a purchasable plan");
  }

  const token = await getAccessToken();
  const price = PLANS[plan].price;

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: `Velvet ${PLANS[plan].name} — ${PLANS[plan].dailyLimit === Infinity ? "unlimited" : PLANS[plan].dailyLimit} replies/day`,
          amount: { currency_code: "USD", value: price.toFixed(2) },
        },
      ],
    }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal order creation failed: ${res.status} ${data.message ?? ""}`);
  }

  return { id: data.id as string };
}

export interface PayPalOrder {
  id: string;
  status: string;
  purchase_units: {
    payments: {
      captures: { id: string; status: string; amount: { value: string } }[];
    };
  }[];
}

export async function getPayPalOrder(orderId: string): Promise<PayPalOrder> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal order lookup failed: ${res.status} ${data.message ?? ""}`);
  }

  return data as PayPalOrder;
}

export async function capturePayPalOrder(orderId: string): Promise<PayPalOrder> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal capture failed: ${res.status} ${data.message ?? ""}`);
  }

  return data as PayPalOrder;
}
