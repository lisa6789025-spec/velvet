export type PlanId = "free" | "basic" | "pro" | "unlimited";

export const PAID_PLAN_IDS: PlanId[] = ["basic", "pro", "unlimited"];

export interface Plan {
  name: string;
  price: number;
  dailyLimit: number; // Infinity = unlimited
  blurb: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    name: "Free",
    price: 0,
    dailyLimit: 20,
    blurb: "20 replies a day, forever.",
  },
  basic: {
    name: "Basic",
    price: 10,
    dailyLimit: 50,
    blurb: "50 replies a day.",
  },
  pro: {
    name: "Pro",
    price: 25,
    dailyLimit: 250,
    blurb: "250 replies a day.",
  },
  unlimited: {
    name: "Unlimited",
    price: 50,
    dailyLimit: Infinity,
    blurb: "As many as you need.",
  },
};

export function isPaidPlan(id: string): id is PlanId {
  return PAID_PLAN_IDS.includes(id as PlanId);
}
