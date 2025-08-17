// src/app/api/insights/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { question, context } = await req.json();

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'Missing OPENROUTER_API_KEY' }, { status: 500 });
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are a health coach assistant. Use the provided context (daily metrics and short chat snippets) to explain succinctly why a decision might have been made. Prefer concrete, safe recommendations and short bullet points.'
    },
    {
      role: 'user',
      content:
        `Context:\n${context}\n\nQuestion: ${question}\n` +
        `Answer with 3–6 bullet points and end with one actionable tip.`
    }
  ];

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'MediVault Insights'
    },
    body: JSON.stringify({
      // pick any public model you like on OpenRouter; Claude 3.5 is strong for reasoning
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: 0.2,
      max_tokens: 600,
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const data = await resp.json();
  const answer = data.choices?.[0]?.message?.content || '';
  return NextResponse.json({ answer });
}
