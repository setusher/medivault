// components/InsightsBot.tsx
'use client';
import { useState } from 'react';

type BotMsg = { role: 'user' | 'assistant'; content: string };

export default function InsightsBot({
  open,
  onClose,
  memberId,
  memberName,
  week,
  context,   // [{role, text, createdAt}]
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  week: string;
  context: Array<{ role?: string; text?: string; createdAt?: string }>;
}) {
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState<BotMsg[]>([
    {
      role: 'assistant',
      content: `Hi! Ask me anything about ${memberName}'s Week ${week} chats. For example: "Summarize adherence", "What changed vs last week?", or "List action items for travel days".`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ask = async (seed?: string) => {
    const query = (seed ?? q).trim();
    if (!query) return;
    setErr(null);
    setMsgs((m) => [...m, { role: 'user', content: query }]);
    setQ('');
    setLoading(true);

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          memberId,
          memberName,
          week,
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      const text = String(data.text || '');
      setMsgs((m) => [...m, { role: 'assistant', content: text }]);
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.panel} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <div style={{ fontWeight: 700 }}>Insights • {memberName} • Week {week}</div>
          <button onClick={onClose} style={S.close}>✕</button>
        </div>

        <div style={S.body}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...S.bubble, ...(m.role === 'user' ? S.userB : S.botB) }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            </div>
          ))}
          {err && <div style={{ color: '#dc2626', fontSize: 13 }}>{err}</div>}
          {loading && <div style={{ opacity: 0.7, fontSize: 13 }}>Thinking…</div>}
        </div>

        <div style={S.footer}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
            placeholder="Ask about these chats…"
            style={S.input}
          />
          <button onClick={() => ask()} style={S.askBtn} disabled={loading}>Ask</button>
        </div>

        <div style={S.examples}>
          <span style={S.example} onClick={() => ask('Summarize this week into 5 bullets')}>Summary</span>
          <span style={S.example} onClick={() => ask('What risks or red flags do you see?')}>Risks</span>
          <span style={S.example} onClick={() => ask('Give 3 actionable suggestions for next week')}>Actions</span>
          <span style={S.example} onClick={() => ask('How did sleep and HRV trend?')}>Sleep/HRV</span>
        </div>

        <div style={S.discl}>AI can be wrong. Educational purposes only, not medical advice.</div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'grid', placeItems: 'center', zIndex: 50,
  },
  panel: {
    width: 'min(720px, 92vw)', maxHeight: '82vh',
    background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)',
    display: 'grid', gridTemplateRows: '48px 1fr 56px auto auto', overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 12px', borderBottom: '1px solid rgba(0,0,0,0.08)',
    background: '#F8FAFC',
  },
  close: {
    border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, background: '#fff', cursor: 'pointer',
    height: 28, width: 28, lineHeight: '26px', textAlign: 'center' as const,
  },
  body: { overflowY: 'auto', padding: 12, display: 'grid', gap: 8 },
  footer: {
    display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: 10,
    borderTop: '1px solid rgba(0,0,0,0.08)', background: '#F8FAFC',
  },
  input: {
    padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)',
    outline: 'none',
  },
  askBtn: {
    padding: '12px 18px', borderRadius: 12, background: '#111827', color: '#fff',
    border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer',
  },
  bubble: {
    maxWidth: 560, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
  },
  userB: { background: '#DCFCE7' }, // green-ish
  botB: { background: '#EEF2FF' },  // indigo-ish
  examples: {
    display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 12px',
    borderTop: '1px dashed rgba(0,0,0,0.08)', background: '#FAFAFA',
  },
  example: {
    fontSize: 12, padding: '6px 8px', background: '#fff', borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer',
  },
  discl: { padding: '6px 12px', fontSize: 12, opacity: 0.7 },
};
