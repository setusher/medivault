'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';

type MetricRow = {
  id: string;
  date?: string; // "2026-01-19"
  HRV?: any;
  RHR?: any;
  Sleep?: any;
};

const BASE = new Date(2025, 8, 17); // 17 Sep 2025

function toDate(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(+d) ? null : d;
}

function weekFromBase(d: Date) {
  const ms = d.getTime() - BASE.getTime();
  const days = Math.floor(ms / (24 * 3600 * 1000));
  return Math.max(1, Math.floor(days / 7) + 1);
}

function num(v: any) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Normalizes the `metrics` document into rows.
 *  Supports:
 *   - data.series as ARRAY  -> [{...}, ...]
 *   - data.series as MAP    -> {"0": {...}, "1": {...}}
 *   - top-level entries     -> {"0": {...}, "1": {...}}
 *   - data.items as ARRAY   -> [{...}, ...]  (fallback)
 */
function normalizeMetricDoc(d: any): MetricRow[] {
  if (!d || typeof d !== 'object') return [];

  // 1) series is an ARRAY
  if (Array.isArray(d.series)) {
    return d.series.map((x: any, i: number) => ({ id: String(i), ...(x || {}) }));
  }

  // 2) series is a MAP with numeric keys
  if (d.series && typeof d.series === 'object' && !Array.isArray(d.series)) {
    return Object.entries(d.series).map(([k, v]) => ({ id: String(k), ...(v as any) }));
  }

  // 3) top-level numeric keys
  const topLevelNumericKeys = Object.entries(d).filter(([k, v]) =>
    !Number.isNaN(Number(k)) && v && typeof v === 'object'
  );
  if (topLevelNumericKeys.length) {
    return topLevelNumericKeys.map(([k, v]) => ({ id: String(k), ...(v as any) }));
  }

  // 4) data.items as ARRAY
  if (Array.isArray(d.items)) {
    return d.items.map((x: any, i: number) => ({ id: String(i), ...(x || {}) }));
  }

  return [];
}

export default function ProgressPage() {
  const db = useMemo(() => getFirestoreDB(), []);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ uid: string; email?: string | null } | null>(null);

  const [rows, setRows] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const auth = await getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u ? { uid: u.uid, email: u.email } : null);
        setReady(true);
      });
      return () => unsub();
    })();
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    const memberId = user.email.split('@')[0];

    (async () => {
      setLoading(true);
      try {
        let list: MetricRow[] = [];

        // A) single doc: /users/{memberId}/meta/metrics
        try {
          const docRef = doc(db, 'users', memberId, 'meta', 'metrics');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            list = normalizeMetricDoc(data);
          }
        } catch (e: any) {
          // Silent error handling
        }

        // B) optional subcollection: /users/{memberId}/meta/metrics/metrics
        if (list.length === 0) {
          try {
            const colRef = collection(db, 'users', memberId, 'meta', 'metrics', 'metrics');
            const snap = await getDocs(query(colRef, orderBy('date', 'asc')));
            list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          } catch (e: any) {
            // Silent error handling
          }
        }

        // Order + synthesize missing dates
        if (list.length) {
          // Always use sequential dates starting from BASE, regardless of existing dates
          const asNum = (id: string) => {
            const n = Number(id);
            return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
          };
          list.sort((a, b) => asNum(a.id) - asNum(b.id));
          for (let i = 0; i < list.length; i++) {
            const dt = new Date(BASE.getTime() + i * 24 * 3600 * 1000);
            list[i].date = dt.toISOString().slice(0, 10);
          }
        }

        setRows(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, user]);

  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!user) {
    return (
      <main style={S.wrap}>
        <header style={S.header}>
          <Link href="/" style={S.back}>← Home</Link>
          <div style={{ fontWeight: 800 }}>Health Progress</div>
        </header>
        <div style={S.centerCard}>
          <div>Please sign in to view your progress.</div>
          <Link href="/auth" style={S.primary}>Go to sign in</Link>
        </div>
      </main>
    );
  }

  const memberId = user.email?.split('@')[0] ?? 'me';

  return (
    <main style={S.wrap}>
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={S.back}>← Home</Link>
          <div style={{ fontWeight: 800 }}>Health Progress • {memberId}</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Starting {BASE.toLocaleDateString()}</div>
      </header>

      <section style={S.grid}>
        {loading && <div style={S.empty}>Loading metrics…</div>}

        {!loading && rows.length === 0 && (
          <div style={S.empty}>No metrics found yet.</div>
        )}

        {!loading && rows.map((r, i) => {
          const d = toDate(r.date || '') ?? new Date(BASE.getTime() + i * 24 * 3600 * 1000);
          const pretty = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
          const wk = weekFromBase(d);
          const hrv = num(r.HRV);
          const rhr = num(r.RHR);
          const slp = num(r.Sleep);

          return (
            <article key={r.id} style={C.card}>
              <div style={C.dateRow}>
                <div style={C.date}>{pretty}</div>
                <Link href={`/chats/${memberId}/${String(wk)}`} style={C.weekLink}>
                  Week {wk} • Open chat →
                </Link>
              </div>

              <div style={C.stats}>
                <div style={{ ...C.stat, background: '#F1FFF7', borderColor: '#B9F0CF' }}>
                  <div style={C.statLabel}>HRV</div>
                  <div style={C.statValue}>{hrv ?? '—'}</div>
                </div>
                <div style={{ ...C.stat, background: '#FFF6F2', borderColor: '#F7C8B9' }}>
                  <div style={C.statLabel}>RHR</div>
                  <div style={C.statValue}>{rhr ?? '—'}</div>
                </div>
                <div style={{ ...C.stat, background: '#F2F0FF', borderColor: '#CFC8FF' }}>
                  <div style={C.statLabel}>Sleep</div>
                  <div style={C.statValue}>{slp ?? '—'}</div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

/* ----------------- styles ----------------- */
const PASTEL_BG = 'linear-gradient(#ECECEC, #E7F1ED)';

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: '100vh', background: PASTEL_BG, display: 'grid', gridTemplateRows: '56px auto' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 12px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)',
  },
  back: {
    textDecoration: 'none', color: '#333', padding: '6px 10px',
    borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
  },
  grid: { padding: 12, display: 'grid', gap: 12, maxWidth: 980, margin: '0 auto 24px' },
  empty: {
    background: '#fff', border: '1px dashed rgba(0,0,0,0.1)',
    borderRadius: 12, padding: 24, textAlign: 'center' as const, color: 'rgba(0,0,0,0.7)',
  },
  centerCard: {
    margin: '10vh auto', maxWidth: 420, background: '#fff',
    border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 24, textAlign: 'center' as const,
  },
  primary: {
    display: 'inline-block', marginTop: 10, padding: '10px 16px',
    background: '#111', color: '#fff', borderRadius: 10, textDecoration: 'none',
  },
};

const C: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 14,
    padding: 14,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    display: 'grid',
    gap: 10,
  },
  dateRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  date: { fontWeight: 800, fontSize: 16, color: '#333' },
  weekLink: {
    fontSize: 12, textDecoration: 'none', color: '#0a7d5a',
    border: '1px solid rgba(10,125,90,0.25)', padding: '4px 8px', borderRadius: 8,
    background: 'rgba(10,125,90,0.06)',
  },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  stat: { borderRadius: 12, border: '1px solid', padding: 12, display: 'grid', gap: 4, minHeight: 72 },
  statLabel: { fontSize: 12, opacity: 0.75, color: '#444' },
  statValue: { fontSize: 24, fontWeight: 900, lineHeight: 1, color: '#333' },
};