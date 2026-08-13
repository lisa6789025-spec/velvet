import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/serverClient";
import { getPlan } from "@/lib/usage";
import { detectAIContentWithLog } from "@/lib/aiDetector";

export async function POST(req: NextRequest) {
  try {
    let supabase;
    try {
      supabase = createServerSupabase();
    } catch {
      return NextResponse.json(
        { error: "Could not read the auth session." },
        { status: 401 }
      );
    }

    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // AI detection is an Unlimited-plan feature.
    const plan = await getPlan(user.id);
    if (plan !== "unlimited") {
      return NextResponse.json({
        aiEnabled: false,
        aiScore: null,
        aiLabel: null,
        aiConfidence: null,
        log: `not unlimited (plan: ${plan})`,
      });
    }

    const body = await req.json();
    const text: string = body.text ?? "";
    if (!text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const { detection, log } = await detectAIContentWithLog(text);
    return NextResponse.json({
      aiEnabled: true,
      aiScore: detection ? Math.round(detection.score * 100) : null,
      aiLabel: detection?.label ?? null,
      aiConfidence: detection?.confidence ?? null,
      log,
    });
  } catch (err) {
    console.error("check-ai failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Server error: ${err.message}`
            : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}
