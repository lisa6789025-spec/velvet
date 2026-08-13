"use client";

import { useEffect, useRef } from "react";
import type { PlanId } from "@/lib/pricing";

declare global {
  interface Window {
    paypal?: any;
  }
}

let sdkPromise: Promise<void> | null = null;

function loadPayPalSdk(clientId: string): Promise<void> {
  if (sdkPromise) return sdkPromise;
  if (typeof window !== "undefined" && window.paypal) {
    sdkPromise = Promise.resolve();
    return sdkPromise;
  }
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "paypal-js-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Could not load PayPal"));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

export default function PayPalButton({
  plan,
  clientId,
  onSuccess,
  onError,
}: {
  plan: PlanId;
  clientId: string;
  onSuccess: (plan: PlanId) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!clientId || renderedRef.current) return;
    let cancelled = false;

    loadPayPalSdk(clientId)
      .then(() => {
        if (cancelled || !containerRef.current || !window.paypal) return;
        renderedRef.current = true;
        window.paypal
          .Buttons({
            createOrder: async () => {
              const res = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan }),
              });
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data.error || "Could not start payment");
              }
              return data.id as string;
            },
            onApprove: async (data: { orderID: string }) => {
              const res = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderID }),
              });
              const json = await res.json();
              if (!res.ok) {
                throw new Error(json.error || "Payment could not be confirmed");
              }
              onSuccess(json.plan as PlanId);
            },
            onError: (err: unknown) => {
              onError(err instanceof Error ? err.message : "PayPal error");
            },
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
              height: 44,
            },
          })
          .render(containerRef.current);
      })
      .catch((err: unknown) => {
        onError(err instanceof Error ? err.message : "Could not load PayPal");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, plan, onSuccess, onError]);

  return (
    <div ref={containerRef} style={{ minHeight: 44 }} className="paypal-wrap" />
  );
}
