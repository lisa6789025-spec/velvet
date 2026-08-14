import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { checkAndConsumeUsage } from "@/lib/usage";
import { createServerSupabase } from "@/lib/serverClient";
import { detectAIContentWithLog } from "@/lib/aiDetector";

// Read once per server instance, not per-request.
// next.config.js outputFileTracingIncludes ships prompts/ into the
// serverless function so this works on Vercel too.
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(process.cwd(), "prompts", "system-prompt.txt"),
  "utf-8"
);

const MIN_REPLY_CHARS = 70;

// Cap every provider call so one slow or rate-limited model can't stall the
// request for minutes. Groq's free tier sends a Retry-After header on 429s
// and the OpenAI SDK honors it by sleeping up to 60s per retry — that alone
// can make a single reply take ~1 minute.
const PROVIDER_TIMEOUT_MS = 15000;

// Free-tier limits are per-model/per-provider, so when one quota bucket is
// exhausted we keep serving by trying the next model and provider.
const DEFAULT_GROQ_FALLBACKS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
  "qwen/qwen3.6-27b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

const DEFAULT_OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-24b-instruct:free",
  "google/gemini-2.5-flash:free",
];

function envList(name: string, fallback: string[]): string[] {
  const fromEnv = (process.env[name] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : fallback;
}

function groqModels(): string[] {
  const fallbacks = envList("GROQ_FALLBACK_MODELS", DEFAULT_GROQ_FALLBACKS);
  // GROQ_MODEL is the explicitly-configured primary — try it first, then the
  // fallback list. Each provider/model is a fresh request, so if it 429s or
  // times out we fail over to the next model immediately.
  const primary = (process.env.GROQ_MODEL || "").trim();
  if (!primary) return fallbacks;
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

function openRouterModels(): string[] {
  return envList("OPENROUTER_MODELS", DEFAULT_OPENROUTER_MODELS);
}

function cleanReply(raw: string): string {
  let text = raw.trim();
  // Some models leak a reasoning/scratchpad block. Drop it whether the closing
  // tag arrived or the output was truncated mid-thought.
  text = text.replace(/<(think|reasoning|scratchpad|thought)(\s[^>]*)?>[\s\S]*?(?:<\/\1>|$)/gi, "");
  text = text.replace(/<\|?(thinking|reasoning)\|?>[\s\S]*?(?:<\|\/?\1\|?>|$)/gi, "");
  // Some reasoning models end the thinking with a final answer marker.
  const finalIdx = text.search(/<\/?final[_\s]?answer\s*>/i);
  if (finalIdx !== -1) {
    text = text.slice(finalIdx).replace(/<\/?final[_\s]?answer\s*>/gi, "").trim();
  }
  // Drop a leading reasoning dump that isn't tag-wrapped. It runs until the
  // reply starts on a new paragraph; if the output was nothing but thinking,
  // this leaves an empty reply and the retry loop picks it up.
  if (
    /^(here's a thinking process|thinking process|thinking|reasoning|chain of thought|let me analyze|i'll analyze|deconstruct and analyze)\s*[:.]/im.test(
      text
    )
  ) {
    const breakIdx = text.indexOf("\n\n");
    text = breakIdx === -1 ? "" : text.slice(breakIdx + 2);
  }
  // If the model labeled its answer, jump straight to it.
  const marker = text.search(
    /^(reply|response|final answer|my reply|my response|here's my reply|here's my response)\s*[:.]/im
  );
  if (marker !== -1) text = text.slice(marker);
  text = text.replace(
    /^(reply|response|final answer|my reply|my response|here's my reply|here's my response)\s*[:.\s-]*/i,
    ""
  );
  // Drop a leading "REPLY" label if the model ever adds one.
  text = text.replace(/^REPLY[:.\s-]*/i, "");
  // Cut anything after a "NOTES" section if the model ever adds one.
  const notesIdx = text.search(/\bNOTES\b/i);
  if (notesIdx !== -1) text = text.slice(0, notesIdx);
  // Strip wrapping quotes.
  text = text.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return text;
}

interface Provider {
  name: string;
  models: string[];
  generate: (model: string, userContent: string) => Promise<string>;
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.GROQ_API_KEY) {
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: PROVIDER_TIMEOUT_MS,
      maxRetries: 0,
    });
    providers.push({
      name: "groq",
      models: groqModels(),
      generate: async (model, userContent) => {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          max_tokens: 384,
          temperature: 0.9,
        });
        return completion.choices[0]?.message?.content ?? "";
      },
    });
  }

  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      timeout: PROVIDER_TIMEOUT_MS,
      maxRetries: 0,
    });
    providers.push({
      name: "openrouter",
      models: openRouterModels(),
      generate: async (model, userContent) => {
        const completion = await openrouter.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          max_tokens: 384,
          temperature: 0.9,
        });
        return completion.choices[0]?.message?.content ?? "";
      },
    });
  }

  if (process.env.GEMINI_API_KEY) {
    const geminiModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    providers.push({
      name: "gemini",
      models: [geminiModel],
      generate: async (model, userContent) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": process.env.GEMINI_API_KEY!,
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `${SYSTEM_PROMPT}\n\n${userContent}` }],
                  },
                ],
                generationConfig: { maxOutputTokens: 384, temperature: 0.9 },
              }),
              signal: controller.signal,
            }
          );
          if (!res.ok) {
            throw new Error(`gemini ${res.status}: ${await res.text()}`);
          }
          const data = await res.json();
          return (
            data?.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text ?? "")
              .join("") ?? ""
          );
        } finally {
          clearTimeout(timer);
        }
      },
    });
  }

  return providers;
}

function buildUserContent(conversation: string, reminder?: string): string {
  return `Conversation so far:\n${conversation}\n\nSuggest one reply. Output the reply only — no thinking, reasoning, or planning.${reminder ? `\n\n${reminder}` : ""}`;
}

async function generateReply(conversation: string, reminder?: string): Promise<string> {
  const providers = buildProviders();
  if (providers.length === 0) {
    throw new Error("No AI providers configured (GROQ_API_KEY / OPENROUTER_API_KEY / GEMINI_API_KEY).");
  }

  const userContent = buildUserContent(conversation, reminder);
  let lastError: unknown = null;

  for (const provider of providers) {
    for (const model of provider.models) {
      try {
        const text = cleanReply(await provider.generate(model, userContent));
        if (text) return text;
        lastError = new Error(`${provider.name}/${model} returned an empty reply`);
      } catch (err) {
        lastError = err;
        console.error(
          `[generate-reply] ${provider.name}/${model} failed:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  throw lastError ?? new Error("No AI model available");
}

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

    const body = await req.json();
    const conversation: string = body.conversation ?? "";

    if (!conversation.trim()) {
      return NextResponse.json({ error: "conversation is required" }, { status: 400 });
    }

    const usage = await checkAndConsumeUsage(user.id);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "Daily limit reached — come back tomorrow" },
        { status: 429 }
      );
    }

    let reply = await generateReply(conversation);

    // The 70-character minimum is mandatory — retry a few times if the model
    // comes back short, feeding it the short draft so it can extend it.
    for (let attempt = 0; reply.length < MIN_REPLY_CHARS && attempt < 3; attempt++) {
      reply = await generateReply(
        conversation,
        `Your previous reply was only ${reply.length} characters — too short. Write a new reply that is AT LEAST ${MIN_REPLY_CHARS} characters. Do not include this instruction in the reply.`
      );
    }

    // AI detection is an Unlimited-plan feature — skip it for everyone else.
    const aiEnabled = usage.plan === "unlimited";
    let aiScore: number | null = null;
    let aiLabel: string | null = null;
    let aiConfidence: string | null = null;
    let detectLog: string | null = null;
    if (aiEnabled) {
      try {
        const { detection, log } = await detectAIContentWithLog(reply);
        detectLog = log;
        if (detection) {
          aiScore = Math.round(detection.score * 100);
          aiLabel = detection.label;
          aiConfidence = detection.confidence;
        }
      } catch {
        aiScore = null;
        detectLog = "detector threw an unexpected error";
      }
    }

    return NextResponse.json({
      reply,
      remaining: usage.remaining,
      aiEnabled,
      aiScore,
      aiLabel,
      aiConfidence,
      detectLog,
    });
  } catch (err) {
    console.error("generate-reply failed:", err);
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
