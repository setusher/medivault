// app/api/insights/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type InsightBody = {
  query: string;
  memberName?: string;
  memberId?: string;
  week?: string | number;
  // Array of simple messages for context (keep small-ish)
  context: Array<{
    role?: string;
    text?: string;
    createdAt?: string;   // ISO string if you have it
  }>;
};

const MODEL = 'anthropic/claude-3.5-sonnet'; // via OpenRouter (change if you want)
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function trimContext(ctx: InsightBody['context'], maxChars = 12000) {
  // Keep last N chars; format lines "role • date: text"
  const lines = ctx.map(m => {
    const role = (m.role ?? '').toString().toLowerCase() || 'message';
    const when = m.createdAt ? new Date(m.createdAt).toLocaleString() : '—';
    const txt  = (m.text ?? '').toString().replace(/\s+/g, ' ').trim();
    return `${role} • ${when}: ${txt}`;
  });

  // keep tail while under limit
  const out: string[] = [];
  let used = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const L = lines[i];
    if (used + L.length + 1 > maxChars) break;
    out.push(L);
    used += L.length + 1;
  }
  return out.reverse().join('\n');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InsightBody;
    const { query, context, memberName = 'Rohan Patel', memberId, week } = body;

    if (!query || !Array.isArray(context)) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    const ctx = trimContext(context);
    const system = [
      `You are a careful, helpful clinical insight assistant for a health coaching app.`,
      `Summarize clearly, extract trends (adherence, nutrition, sleep, HRV, exercise),`,
      `call out risks, and list concise action items.`,
      `Use only the provided chat context; if missing, say what’s missing.`,
      `Your tone is supportive and non-judgmental.`,
      `Do NOT give medical diagnosis. Include a small disclaimer at the end:`,
      `"For educational purposes; not medical advice."`,
    ].join(' ');

    const userPrompt = [
      `Member: ${memberName}${memberId ? ` (id: ${memberId})` : ''}`,
      week ? `Week: ${week}` : '',
      `\n--- CHAT CONTEXT START ---\n${ctx}\n--- CHAT CONTEXT END ---\n`,
      `Question: ${query}`,
      `When helpful, structure the answer into:`,
      `• Key insights • Risks/flags • Coaching suggestions • 3–5 Action items`,
    ].join('\n');

    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY ?? ''}`,
        'Content-Type': 'application/json',
        // These 2 headers are recommended by OpenRouter:
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
        'X-Title': 'Medivault Insights',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 900,
        // OpenAI-compatible schema:
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        stream: false, // keep it simple; you can switch to true + SSE later
      }),
    });

    if (!orRes.ok) {
      const t = await orRes.text();
      return NextResponse.json({ error: `OpenRouter error: ${t}` }, { status: 500 });
    }

    const data = await orRes.json();
    const text =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      '';

    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
