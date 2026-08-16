import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Flush endpoint — the wire this app exposes for flushmessenger.
// No Supabase, no auth, no usage meter: every configured free provider/model
// is fired IN PARALLEL and the first good answer wins, so a slow or
// rate-limited API never makes the messenger wait for it.

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(process.cwd(), "prompts", "system-prompt.txt"),
  "utf-8"
);

const APP_NAME = process.env.FLUSH_APP_NAME?.trim() || path.basename(process.cwd());
const FLUSH_SECRET = (process.env.FLUSH_SECRET || "").trim();

const PROVIDER_TIMEOUT_MS = 15000;
const TOTAL_TIMEOUT_MS = 18000;

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

interface Answer {
  reply: string;
  provider: string;
  model: string;
}

function envList(name: string, fallback: string[]): string[] {
  const fromEnv = (process.env[name] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : fallback;
}

function groqModels(): string[] {
  const fallbacks = envList("GROQ_FALLBACK_MODELS", DEFAULT_GROQ_FALLBACKS);
  const primary = (process.env.GROQ_MODEL || "").trim();
  if (!primary) return fallbacks;
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

function openRouterModels(): string[] {
  return envList("OPENROUTER_MODELS", DEFAULT_OPENROUTER_MODELS);
}

function cleanReply(raw: string): string {
  let text = raw.trim();
  text = text.replace(/<(think|reasoning|scratchpad|thought)(\s[^>]*)?>[\s\S]*?(?:<\/\1>|$)/gi, "");
  text = text.replace(/<\|?(thinking|reasoning)\|?>[\s\S]*?(?:<\|\/?\1\|?>|$)/gi, "");
  const finalIdx = text.search(/<\/?final[_\s]?answer\s*>/i);
  if (finalIdx !== -1) {
    text = text.slice(finalIdx).replace(/<\/?final[_\s]?answer\s*>/gi, "").trim();
  }
  if (
    /^(here's a thinking process|thinking process|thinking|reasoning|chain of thought|let me analyze|i'll analyze|deconstruct and analyze)\s*[:.]/im.test(
      text
    )
  ) {
    const breakIdx = text.indexOf("\n\n");
    text = breakIdx === -1 ? "" : text.slice(breakIdx + 2);
  }
  const marker = text.search(
    /^(reply|response|final answer|my reply|my response|here's my reply|here's my response)\s*[:.]/im
  );
  if (marker !== -1) text = text.slice(marker);
  text = text.replace(
    /^(reply|response|final answer|my reply|my response|here's my reply|here's my response)\s*[:.\s-]*/i,
    ""
  );
  text = text.replace(/^REPLY[:.\s-]*/i, "");
  const notesIdx = text.search(/\bNOTES\b/i);
  if (notesIdx !== -1) text = text.slice(0, notesIdx);
  text = text.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return text;
}

// Resolves with the first non-empty answer as soon as it lands — every other
// request keeps running in the background but is never waited on. If every
// task settles with empty/failed results, reject with the first error.
function firstGoodAnswer(tasks: Promise<Answer>[], timeoutMs: number): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("flush timeout")), timeoutMs);
    let pending = tasks.length;
    const fail = (err: unknown) => {
      clearTimeout(timer);
      reject(err);
    };
    for (const task of tasks) {
      task.then(
        (a) => {
          if (a.reply.trim().length > 0) {
            clearTimeout(timer);
            resolve(a);
          } else if (--pending === 0) {
            fail(new Error("all providers returned empty replies"));
          }
        },
        (err) => {
          if (--pending === 0) fail(err);
        }
      );
    }
  });
}

async function fetchGemini(userContent: string, model: string): Promise<string> {
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
}

function buildTasks(userContent: string): Promise<Answer>[] {
  const tasks: Promise<Answer>[] = [];

  if (process.env.GROQ_API_KEY) {
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: PROVIDER_TIMEOUT_MS,
      maxRetries: 0,
    });
    for (const model of groqModels()) {
      tasks.push(
        groq.chat.completions
          .create({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
            max_tokens: 384,
            temperature: 0.9,
          })
          .then(
            (completion) =>
              ({
                reply: cleanReply(completion.choices[0]?.message?.content ?? ""),
                provider: "groq",
                model,
              }) as Answer
          )
      );
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      timeout: PROVIDER_TIMEOUT_MS,
      maxRetries: 0,
    });
    for (const model of openRouterModels()) {
      tasks.push(
        openrouter.chat.completions
          .create({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
            max_tokens: 384,
            temperature: 0.9,
          })
          .then(
            (completion) =>
              ({
                reply: cleanReply(completion.choices[0]?.message?.content ?? ""),
                provider: "openrouter",
                model,
              }) as Answer
          )
      );
    }
  }

  if (process.env.GEMINI_API_KEY) {
    const geminiModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    tasks.push(
      fetchGemini(userContent, geminiModel).then(
        (reply) =>
          ({ reply: cleanReply(reply), provider: "gemini", model: geminiModel }) as Answer
      )
    );
  }

  return tasks;
}

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true, app: APP_NAME, online: true });
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    if (FLUSH_SECRET) {
      const secret = req.headers.get("x-flush-secret") || "";
      if (secret !== FLUSH_SECRET) {
        return NextResponse.json(
          { ok: false, app: APP_NAME, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const body = await req.json().catch(() => null);
    const conversation = body?.conversation ?? "";
    if (typeof conversation !== "string" || !conversation.trim()) {
      return NextResponse.json(
        { ok: false, app: APP_NAME, error: "conversation is required" },
        { status: 400 }
      );
    }

    const userContent = `Conversation so far:\n${conversation}\n\nSuggest one reply. Output the reply only — no thinking, reasoning, or planning.`;
    const tasks = buildTasks(userContent);
    if (tasks.length === 0) {
      return NextResponse.json(
        { ok: false, app: APP_NAME, error: "No AI providers configured" },
        { status: 500 }
      );
    }

    const answer = await firstGoodAnswer(tasks, TOTAL_TIMEOUT_MS);
    return NextResponse.json({
      ok: true,
      app: APP_NAME,
      reply: answer.reply,
      provider: answer.provider,
      model: answer.model,
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        app: APP_NAME,
        error: err instanceof Error ? err.message : "flush failed",
        latencyMs: Date.now() - started,
      },
      { status: 500 }
    );
  }
}
