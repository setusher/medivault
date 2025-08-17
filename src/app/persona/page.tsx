'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';

type PersonaDoc = {
  persona?: string;                 // e.g. "Busy Juggler"
  confidence?: number;              // 0..1 or 0..100
  llm_summary?: string;
  coaching_tips?: string[] | Record<string, string>; // array or { "0": "...", "1": "..." }
  stats?: Record<string, any>;
  ts?: any;                         // optional timestamp
  updatedAt?: any;                  // optional timestamp
};

function toDateSafe(x: any): Date | null {
  if (!x) return null;
  if (typeof x?.toDate === 'function') return x.toDate();
  if (typeof x?.seconds === 'number') return new Date(x.seconds * 1000);
  const d = new Date(String(x));
  return Number.isNaN(+d) ? null : d;
}
function toArray<T>(v: T[] | Record<string, T> | undefined | null): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.entries(v)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, val]) => val);
}

/* ---------- value formatters for nicer display ---------- */
function isPlainObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function looksLikeTimestamp(v: any) {
  return typeof v?.seconds === 'number' || typeof v?.toDate === 'function';
}
function looksLikeValueUnit(v: any) {
  return isPlainObject(v) && ('value' in v) && ('unit' in v);
}
function formatScalar(v: any): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return v.toLocaleString();
  if (looksLikeTimestamp(v)) {
    const d = toDateSafe(v);
    return d ? d.toLocaleString() : '—';
  }
  return String(v);
}

/* Render values:
   - arrays -> comma-joined
   - { value, unit } -> "value unit"
   - shallow objects -> pretty grid of key/value
   - everything else -> formatted scalar
*/
function StatValue({ value }: { value: any }) {
  if (Array.isArray(value)) {
    return <span>{value.map(formatScalar).join(', ')}</span>;
  }
  if (looksLikeValueUnit(value)) {
    const { value: val, unit } = value;
    return <span>{`${formatScalar(val)} ${unit}`}</span>;
  }
  if (isPlainObject(value)) {
    // Shallow pretty print
    const entries = Object.entries(value);
    if (entries.length === 0) return <span>—</span>;
    return (
      <div style={C.innerKVGrid}>
        {entries.map(([k, v]) => (
          <div key={k} style={C.innerKVItem}>
            <div style={C.innerKVKey}>{k}</div>
            <div style={C.innerKVVal}>
              {isPlainObject(v) || Array.isArray(v)
                ? <StatValue value={v} />
                : formatScalar(v)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <span>{formatScalar(value)}</span>;
}

export default function PersonaPage() {
  const db = useMemo(() => getFirestoreDB(), []);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<{ uid: string; email?: string | null } | null>(null);

  const [persona, setPersona] = useState<PersonaDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const auth = await getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, (u) => {
        setMe(u ? { uid: u.uid, email: u.email } : null);
        setReady(true);
      });
      return () => unsub();
    })();
  }, []);

  useEffect(() => {
    if (!me?.email) return;
    const memberId = me.email.split('@')[0];

    (async () => {
      setLoading(true);
      try {
        const ref = doc(db, 'users', memberId, 'meta', 'persona');
        const snap = await getDoc(ref);
        setPersona(snap.exists() ? (snap.data() as PersonaDoc) : null);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, me]);

  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;

  if (!me) {
    return (
      <main style={S.wrap}>
        <header style={S.header}>
          <Link href="/" style={S.back}>← Home</Link>
          <div style={S.title}>Persona</div>
        </header>
        <div style={S.centerCard}>
          <div>Please sign in to view persona.</div>
          <Link href="/auth" style={S.primary}>Go to sign in</Link>
        </div>
      </main>
    );
  }

  const memberId = me.email?.split('@')[0] ?? 'me';
  const updated =
    toDateSafe(persona?.updatedAt) ||
    toDateSafe(persona?.ts) ||
    null;

  // normalize confidence to 0..1
  const cRaw = persona?.confidence ?? 0;
  const cNorm = cRaw > 1 ? cRaw / 100 : cRaw;
  const confPct = Math.round(Math.max(0, Math.min(1, cNorm)) * 100);

  const tips = toArray(persona?.coaching_tips);
  const stats = persona?.stats || {};

  return (
    <main style={S.wrap}>
      <header style={S.header}>
        <Link href="/" style={S.back}>← Home</Link>
        <div style={S.title}>Persona • {memberId}</div>
        {updated && <div style={S.meta}>Updated {updated.toLocaleString()}</div>}
      </header>

      <section style={S.grid}>
        {/* Persona & confidence */}
        <article style={C.card}>
          <div style={C.hRow}>
            <h3 style={C.h}>Member Persona</h3>
            <div style={C.badge}>{persona?.persona ?? '—'}</div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={C.label}>Confidence</div>
            <div style={C.progressWrap}>
              <div style={{ ...C.progressBar, width: `${confPct}%` }} />
            </div>
            <div style={C.confText}>{confPct}%</div>
          </div>

          {persona?.llm_summary && persona.llm_summary.trim() && (
            <div style={C.block}>
              <div style={C.label}>Summary</div>
              <p style={C.text}>{persona.llm_summary}</p>
            </div>
          )}
        </article>

        {/* Coaching tips */}
        <article style={C.card}>
          <h3 style={C.h}>Coaching Tips</h3>
          {loading && <div style={S.empty}>Loading…</div>}
          {!loading && tips.length === 0 && <div style={S.empty}>No tips found.</div>}
          {!loading && tips.length > 0 && (
            <ol style={C.list}>
              {tips.map((t, i) => (
                <li key={i} style={C.tipItem}>
                  <span style={C.tipIndex}>{i + 1}</span>
                  {/* darker, readable tip text */}
                  <span style={C.tipText}>{t}</span>
                </li>
              ))}
            </ol>
          )}
        </article>

        {/* Stats (render safely whatever shape you store) */}
        <article style={C.card}>
          <h3 style={C.h}>Signals & Stats</h3>
          {(!stats || Object.keys(stats).length === 0) ? (
            <div style={S.empty}>No stats yet.</div>
          ) : (
            <div style={C.kvGrid}>
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} style={C.kvItem}>
                  <div style={C.kvK}>{k}</div>
                  <div style={C.kvV}>
                    <StatValue value={v} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

/* ---------- styles (same pastel look, darker text where needed) ---------- */
const S: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg,#d8e2dc,#ffe5d9 50%,#ffcad4)',
    display: 'grid',
    gridTemplateRows: '56px auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 12px',
    background: '#f4acb7',
    borderBottom: '2px solid #9d8189',
  },
  back: {
    textDecoration: 'none',
    color: 'black',
    padding: '6px 10px',
    fontWeight: 600,
    borderRadius: 8,
    background: '#fff',
    border: '1px solid #9d8189',
  },
  title: { fontWeight: 800, color: '#1f2937', flex: 1 },
  meta: { fontSize: 12, color: '#374151' },
  grid: {
    padding: 12,
    display: 'grid',
    gap: 12,
    maxWidth: 980,
    margin: '0 auto 24px',
    gridTemplateColumns: '1fr',
  },
  empty: {
    background: '#fff',
    border: '2px dashed #9d8189',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center' as const,
    color: '#111827',
  },
  centerCard: {
    margin: '10vh auto',
    maxWidth: 420,
    background: '#fff',
    border: '2px solid #9d8189',
    borderRadius: 16,
    padding: 24,
    textAlign: 'center' as const,
    color: '#111827',
  },
  primary: {
    display: 'inline-block',
    marginTop: 10,
    padding: '10px 16px',
    background: '#9d8189',
    color: 'black',
    borderRadius: 10,
    textDecoration: 'none',
    fontWeight: 600,
  },
};

const C: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    border: '2px solid #9d8189',
    borderRadius: 14,
    padding: 14,
    boxShadow: '0 4px 8px rgba(157,129,137,.15)',
    display: 'grid',
    gap: 12,
  },
  hRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  h: { margin: 0, fontSize: 16, fontWeight: 900, color: '#111827' },
  badge: {
    padding: '6px 10px',
    borderRadius: 999,
    background: '#d8e2dc',
    border: '1px solid #9d8189',
    fontWeight: 800,
    color: '#111827',
    whiteSpace: 'nowrap',
  },
  label: { fontSize: 12, color: '#374151', fontWeight: 600 },
  progressWrap: {
    height: 10,
    borderRadius: 999,
    background: '#f3f4f6',
    border: '1px solid #9d8189',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg,#d8e2dc,#f4acb7)',
  },
  confText: { fontSize: 12, color: '#111827', fontWeight: 700 },

  block: { display: 'grid', gap: 6 },
  text: { margin: 0, color: '#111827', lineHeight: 1.6 },

  list: { margin: 0, padding: '0 0 0 22px', display: 'grid', gap: 10 } as React.CSSProperties,
  tipItem: { display: 'flex', gap: 10, alignItems: 'flex-start' } as React.CSSProperties,
  tipIndex: {
    minWidth: 22,
    height: 22,
    borderRadius: 6,
    background: '#ffe5d9',
    border: '1px solid #9d8189',
    display: 'inline-grid',
    placeItems: 'center',
    fontSize: 12,
    fontWeight: 800,
    color: '#111827',
  },
  // darker, readable tip text
  tipText: { color: '#111827', lineHeight: 1.6, fontSize: 14 },

  kvGrid: { display: 'grid', gap: 10 },
  kvItem: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: 10,
    alignItems: 'baseline',
  } as React.CSSProperties,
  kvK: { fontSize: 12, color: '#374151', fontWeight: 700 },
  kvV: { fontSize: 14, color: '#111827' },

  // nested object pretty grid
  innerKVGrid: {
    display: 'grid',
    gap: 6,
    borderLeft: '3px solid #f4acb7',
    paddingLeft: 10,
  },
  innerKVItem: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: 8,
    alignItems: 'baseline',
  } as React.CSSProperties,
  innerKVKey: { fontSize: 12, color: '#4b5563', fontWeight: 600 },
  innerKVVal: { fontSize: 14, color: '#111827' },
};
