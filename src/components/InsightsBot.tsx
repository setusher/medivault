'use client';
import { useState } from 'react';

export default function InsightBot({
  open,
  onClose,
  seedQuestion,
  context,
}: {
  open: boolean;
  onClose: () => void;
  seedQuestion?: string;
  context: string;
}) {
  const [q, setQ] = useState(seedQuestion || '');
  const [ans, setAns] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  if (!open) return null;

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setAns('');
    setErr('');
    try {
      const r = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.trim(), context }),
      });
      const j = await r.json();
      if (j.error) setErr(j.error);
      else setAns(j.answer || 'No answer');
    } catch (e: any) {
      setErr(e?.message || 'Failed to ask');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <div style={{ fontWeight: 800, color: '#1a1a1a' }}>Why-assistant</div>
          <button onClick={onClose} style={S.x}>✕</button>
        </div>
        <div style={S.quick}>
          <button onClick={() => setQ('Why was a diagnostic or change recommended today?')} style={S.quickBtn}>
            Why today?
          </button>
          <button onClick={() => setQ('What changed vs the previous week and what should I do next?')} style={S.quickBtn}>
            Week vs week
          </button>
          <button onClick={() => setQ('What risks or red flags may the team be acting on?')} style={S.quickBtn}>
            Risks
          </button>
        </div>
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about the decision…"
          style={S.ta}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={ask} disabled={loading || !q.trim()} style={S.ask}>
            {loading ? 'Thinking…' : 'Ask'}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(context)}
            style={S.secondary}
            title="Copy context"
          >
            Copy context
          </button>
        </div>
        {!!err && <div style={S.err}>{err}</div>}
        {!!ans && (
          <div style={S.answer} dangerouslySetInnerHTML={{ __html: ans.replace(/\n/g, '<br/>') }} />
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: { 
    position: 'fixed', 
    inset: 0, 
    background: 'rgba(0,0,0,0.35)', 
    display: 'grid', 
    placeItems: 'end center', 
    zIndex: 9999 
  },
  sheet: { 
    width: 'min(780px, 94vw)', 
    background: '#fff', 
    border: '1px solid rgba(0,0,0,0.08)', 
    borderRadius: 14, 
    margin: 12, 
    padding: 12, 
    boxShadow: '0 10px 28px rgba(0,0,0,0.15)' 
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  x: { 
    border: '1px solid rgba(0,0,0,0.12)', 
    background: '#fff', 
    borderRadius: 8, 
    padding: '4px 10px', 
    cursor: 'pointer',
    color: '#666',
    fontSize: '14px'
  },
  quick: { 
    display: 'flex', 
    gap: 8, 
    flexWrap: 'wrap', 
    marginBottom: 8 
  },
  quickBtn: { 
    padding: '6px 10px', 
    borderRadius: 999, 
    border: '1px solid rgba(0,0,0,0.12)', 
    background: '#f8f9fa', 
    cursor: 'pointer',
    color: '#333',
    fontSize: '13px'
  },
  ta: { 
    width: '100%', 
    minHeight: 80, 
    borderRadius: 10, 
    border: '1px solid rgba(0,0,0,0.12)', 
    padding: 10, 
    margin: '8px 0',
    color: '#333',
    fontSize: '14px'
  },
  ask: { 
    padding: '10px 14px', 
    borderRadius: 10, 
    border: '1px solid rgba(0,0,0,0.12)', 
    background: '#00A884', 
    color: '#fff', 
    fontWeight: 800, 
    cursor: 'pointer',
    fontSize: '14px'
  },
  secondary: { 
    padding: '10px 14px', 
    borderRadius: 10, 
    border: '1px solid rgba(0,0,0,0.12)', 
    background: '#fff', 
    cursor: 'pointer',
    color: '#555',
    fontSize: '14px'
  },
  answer: { 
    marginTop: 12, 
    padding: 12, 
    borderRadius: 10, 
    border: '1px solid rgba(0,0,0,0.1)', 
    background: '#fafafa', 
    lineHeight: 1.55,
    color: '#2c2c2c',
    fontSize: '14px'
  },
  err: { 
    marginTop: 8, 
    color: '#dc3545', 
    fontSize: 13,
    fontWeight: 500
  },
};