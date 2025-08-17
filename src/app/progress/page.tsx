'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import InsightBot from '@/components/InsightsBot';

import {
  collection, getDocs, query, orderBy, doc, getDoc, limit,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';

type MetricRow = {
  id: string;
  date?: string; // ISO
  HRV?: any;
  RHR?: any;
  Sleep?: any;
};

type ChatMsg = {
  text?: string;
  message?: string;
  content?: string;
  senderName?: string;
  name?: string;
  role?: string;
  createdAt?: any;
  time?: any;
  timestamp?: any;
  date?: any;
  [k: string]: any;
};

// ---- BASELINE: always start dating from 17 Sept 2025
const BASE = new Date(2025, 8, 18); // (month is 0-indexed)

/* ---------- helpers ---------- */
function toDate(s?: string | number | Date | null) {
  if (!s) return null;
  if (s instanceof Date) return Number.isNaN(+s) ? null : s;
  if (typeof s === 'number') return new Date(s);
  if (typeof s === 'string') {
    const d = new Date(s);
    return Number.isNaN(+d) ? null : d;
  }
  return null;
}
function toDateSafe(ts: any) {
  if (!ts) return null;
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
  return toDate(ts);
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}
function weekFromBase(d: Date) {
  const ms = d.getTime() - BASE.getTime();
  const days = Math.floor(ms / (24 * 3600 * 1000));
  // Week 1: days 0..6, Week 2: 7..13, etc.
  return Math.max(1, Math.floor(days / 7) + 1);
}
function num(v: any) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function normalizeMetricDoc(d: any): MetricRow[] {
  if (!d || typeof d !== 'object') return [];
  if (Array.isArray(d.series)) {
    return d.series.map((x: any, i: number) => ({ id: String(i), ...(x || {}) }));
  }
  if (d.series && typeof d.series === 'object') {
    return Object.entries(d.series).map(([k, v]) => ({ id: String(k), ...(v as any) }));
  }
  const top = Object.entries(d).filter(([k, v]) => !Number.isNaN(Number(k)) && v && typeof v === 'object');
  if (top.length) return top.map(([k, v]) => ({ id: String(k), ...(v as any) }));
  if (Array.isArray(d.items)) return d.items.map((x: any, i: number) => ({ id: String(i), ...(x || {}) }));
  return [];
}

/* ---------- page ---------- */
export default function ProgressPage() {
  const db = useMemo(() => getFirestoreDB(), []);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ uid: string; email?: string | null } | null>(null);

  const [rows, setRows] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState<string>('');

  // chat week ids present in Firestore (for robust linking)
  const [weekIds, setWeekIds] = useState<string[]>([]);

  // why-bot
  const [botOpen, setBotOpen] = useState(false);
  const [botCtx, setBotCtx] = useState('');
  const [seedQ, setSeedQ] = useState<string | undefined>(undefined);

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

  // Load available week doc IDs for robust links (handles 1 vs "01")
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const memberId = user.email!.split('@')[0];
      const wcol = collection(db, 'users', memberId, 'weeks');
      const snap = await getDocs(wcol);
      const ids = snap.docs.map(d => d.id);
      setWeekIds(ids);
    })();
  }, [db, user]);

  // Load metrics, then force-date them from BASE so each week has exactly 7 days
  useEffect(() => {
    if (!user?.email) return;
    const memberId = user.email.split('@')[0];

    (async () => {
      setLoading(true);
      try {
        let list: MetricRow[] = [];
        const tried: string[] = [];

        // metrics doc
        try {
          const ref = doc(db, 'users', memberId, 'meta', 'metrics');
          tried.push(`/users/${memberId}/meta/metrics (doc)`);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            list = normalizeMetricDoc(snap.data());
          }
        } catch (e: any) {
          tried.push(`(doc error: ${e?.code || e?.message || 'unknown'})`);
        }

        // optional: subcollection fallback
        if (!list.length) {
          try {
            const col = collection(db, 'users', memberId, 'meta', 'metrics', 'metrics');
            tried.push(`/users/${memberId}/meta/metrics/metrics (subcollection)`);
            const snap = await getDocs(query(col, orderBy('date', 'asc')));
            list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          } catch (e: any) {
            tried.push(`(subcol error: ${e?.code || e?.message || 'unknown'})`);
          }
        }

        // ---- Force sequential dating from BASE (i = days since BASE)
        // This guarantees: Week 1 has exactly 7 boxes (i=0..6), Week 2 next 7, etc.
        if (list.length) {
          // Prefer numeric id ordering when available, else fall back to date or id
          list.sort((a, b) => {
            const ai = Number(a.id); const bi = Number(b.id);
            if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi;
            const ta = toDate(a.date || '')?.getTime() ?? 0;
            const tb = toDate(b.date || '')?.getTime() ?? 0;
            if (ta !== tb) return ta - tb;
            return String(a.id).localeCompare(String(b.id));
          });

          list = list.map((row, i) => {
            const d = new Date(BASE.getTime() + i * 24 * 3600 * 1000);
            return { ...row, date: d.toISOString().slice(0, 10) };
          });
        }

        setRows(list);
        // setDebug(
        //   `Loaded ${list.length} metrics • BASE: ${BASE.toLocaleDateString()} • First date forced to: ` +
        //   `${list[0]?.date || 'none'} • Weeks derived by 7-day slices • tried: ${tried.join(' → ')}`
        // );
      } finally {
        setLoading(false);
      }
    })();
  }, [db, user]);

  if (!ready) return <div style={{ padding: 16, color: '#2c2c2c' }}>Loading…</div>;
  if (!user) {
    return (
      <main style={S.wrap}>
        <header style={S.header}>
          <Link href="/" style={S.back}>← Home</Link>
          <div style={{ fontWeight: 800, color: '#2c2c2c' }}>Health Progress</div>
        </header>
        <div style={S.centerCard}>
          <div style={{ color: '#2c2c2c' }}>Please sign in to view your progress.</div>
          <Link href="/auth" style={S.primary}>Go to sign in</Link>
        </div>
      </main>
    );
  }

  const memberId = user.email?.split('@')[0] ?? 'me';

  /** choose the actual week doc id (supports '1' or '01', etc.) */
  const weekIdFor = (wk: number) => {
    const raw = String(wk);
    if (weekIds.includes(raw)) return raw;
    const p2 = raw.padStart(2, '0');
    if (weekIds.includes(p2)) return p2;
    const p3 = raw.padStart(3, '0');
    if (weekIds.includes(p3)) return p3;
    return raw; // fallback
  };

  /** Fetch a tiny same-day chat snippet for extra context */
  const fetchDaySnippet = async (d: Date) => {
    const week = String(weekFromBase(d));
    try {
      const msgCol = collection(db, 'users', memberId, 'weeks', weekIdFor(Number(week)), 'messages');
      const snap = await getDocs(query(msgCol, orderBy('createdAt', 'asc'), limit(400)));
      const sameDay: string[] = [];
      for (const docSnap of snap.docs) {
        const m = docSnap.data() as ChatMsg;
        const dt =
          toDateSafe(m.createdAt) ||
          toDateSafe(m.timestamp) ||
          toDateSafe(m.time) ||
          toDateSafe(m.date);
        if (!dt) continue;
        if (isSameDay(dt, d)) {
          const who =
            m.senderName || m.name || (m.role === 'patient' ? 'Member' : m.role || 'Team');
          const txt = (m.text ?? m.message ?? m.content ?? '').toString().trim();
          if (txt) sameDay.push(`${who}: ${txt}`);
        }
      }
      return sameDay.slice(-10).join('\n');
    } catch {
      return '';
    }
  };

  /** When clicking Ask why, build the context and open the bot */
  const openWhy = async (row: MetricRow, idx: number) => {
    const d = toDate(row.date || '') ?? new Date(BASE.getTime() + idx * 24 * 3600 * 1000);
    const pretty = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const wk = weekFromBase(d);

    const hrv = num(row.HRV);
    const rhr = num(row.RHR);
    const slp = num(row.Sleep);

    // previous day deltas
    const prev = rows[idx - 1];
    const prevH = prev ? num(prev.HRV) : undefined;
    const prevR = prev ? num(prev.RHR) : undefined;
    const prevS = prev ? num(prev.Sleep) : undefined;

    const deltas: string[] = [];
    if (hrv !== undefined && prevH !== undefined) deltas.push(`ΔHRV=${(hrv - prevH) >= 0 ? '+' : ''}${(hrv - prevH).toFixed(1)}`);
    if (rhr !== undefined && prevR !== undefined) deltas.push(`ΔRHR=${(rhr - prevR) >= 0 ? '+' : ''}${(rhr - prevR).toFixed(1)}`);
    if (slp !== undefined && prevS !== undefined) deltas.push(`ΔSleep=${(slp - prevS) >= 0 ? '+' : ''}${(slp - prevS).toFixed(2)}h`);

    const snippet = await fetchDaySnippet(d);

    const contextLines = [
      `Date: ${pretty} (${ymd(d)}), Week ${wk}`,
      `Member: ${memberId}`,
      `Metrics: HRV=${hrv ?? 'NA'}, RHR=${rhr ?? 'NA'}, Sleep=${slp ?? 'NA'}h${deltas.length ? ` (${deltas.join(', ')})` : ''}`,
      snippet ? `Chat snippet:\n${snippet}` : `Chat snippet: (none found for this day)`,
    ];

    setSeedQ('Why did the team make changes or recommendations today?');
    setBotCtx(contextLines.join('\n'));
    setBotOpen(true);
  };

  return (
    <main style={S.wrap}>
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={S.back}>← Home</Link>
          <div style={{ fontWeight: 800, color: '#2c2c2c' }}>Health Progress • {memberId}</div>
        </div>
        <div style={{ fontSize: 12, color: '#4a4a4a' }}>Starting {BASE.toLocaleDateString()}</div>
      </header>

      {debug && <div style={S.debug}>{debug}</div>}

      <section style={S.grid}>
        {loading && <div style={S.empty}>Loading metrics…</div>}

        {!loading && rows.length === 0 && (
          <div style={S.empty}>No metrics found yet.</div>
        )}

        {!loading && rows.map((r, i) => {
          // date is forced to BASE + i days
          const d = toDate(r.date || '') ?? new Date(BASE.getTime() + i * 24 * 3600 * 1000);
          const pretty = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
          const wk = weekFromBase(d);
          const hrv = num(r.HRV);
          const rhr = num(r.RHR);
          const slp = num(r.Sleep);

          const weekDocId = weekIdFor(wk);

          return (
            <article key={r.id} style={C.card}>
              <div style={C.dateRow}>
                <div style={C.date}>{pretty}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openWhy(r, i)} style={C.whyBtn}>Ask why</button>
                  <Link href={`/chats/${memberId}/${weekDocId}`} style={C.weekLink}>
                    Week {wk} • Open chat →
                  </Link>
                </div>
              </div>

              <div style={C.stats}>
                <div style={{ ...C.stat, background: '#d8e2dc', borderColor: '#9d8189' }}>
                  <div style={C.statLabel}>HRV</div>
                  <div style={C.statValue}>{hrv ?? '—'}</div>
                </div>
                <div style={{ ...C.stat, background: '#ffe5d9', borderColor: '#9d8189' }}>
                  <div style={C.statLabel}>RHR</div>
                  <div style={C.statValue}>{rhr ?? '—'}</div>
                </div>
                <div style={{ ...C.stat, background: '#ffcad4', borderColor: '#9d8189' }}>
                  <div style={C.statLabel}>Sleep</div>
                  <div style={C.statValue}>{slp ?? '—'}</div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <InsightBot open={botOpen} onClose={() => setBotOpen(false)} seedQuestion={seedQ} context={botCtx} />
    </main>
  );
}

/* ----------------- styles ----------------- */
const PASTEL_BG = 'linear-gradient(135deg, #d8e2dc 0%, #ffe5d9 50%, #ffcad4 100%)';

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: '100vh', background: PASTEL_BG, display: 'grid', gridTemplateRows: '56px auto' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 12px', background: '#f4acb7', borderBottom: '2px solid #9d8189',
  },
  back: {
    textDecoration: 'none', color: '#2c2c2c', padding: '6px 10px', fontWeight: 600,
    borderRadius: 8, background: '#fff', border: '1px solid #9d8189',
  },
  debug: {
    maxWidth: 980, margin: '8px auto 0', padding: '8px 12px',
    background: '#ffe5d9', border: '1px solid #9d8189', color: '#2c2c2c',
    borderRadius: 8, fontSize: 12,
  },
  grid: { padding: 12, display: 'grid', gap: 12, maxWidth: 980, margin: '0 auto 24px' },
  empty: {
    background: '#fff', border: '2px dashed #9d8189',
    borderRadius: 12, padding: 24, textAlign: 'center' as const, color: '#2c2c2c',
  },
  centerCard: {
    margin: '10vh auto', maxWidth: 420, background: '#fff',
    border: '2px solid #9d8189', borderRadius: 16, padding: 24, textAlign: 'center' as const,
  },
  primary: {
    display: 'inline-block', marginTop: 10, padding: '10px 16px',
    background: '#9d8189', color: '#fff', borderRadius: 10, textDecoration: 'none',
    fontWeight: 600,
  },
};

const C: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    border: '2px solid #9d8189',
    borderRadius: 14,
    padding: 14,
    boxShadow: '0 4px 8px rgba(157, 129, 137, 0.15)',
    display: 'grid',
    gap: 10,
  },
  dateRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  date: { fontWeight: 800, fontSize: 16, color: '#2c2c2c' },
  weekLink: {
    fontSize: 12, textDecoration: 'none', color: '#2c2c2c', fontWeight: 600,
    border: '1px solid #9d8189', padding: '4px 8px', borderRadius: 8,
    background: '#d8e2dc',
  },
  whyBtn: {
    fontSize: 12, padding: '6px 10px', borderRadius: 8,
    border: '1px solid #9d8189', background: '#f4acb7', cursor: 'pointer',
    color: '#2c2c2c', fontWeight: 600
  },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  stat: { borderRadius: 12, border: '2px solid', padding: 12, display: 'grid', gap: 4, minHeight: 72 },
  statLabel: { fontSize: 12, color: '#4a4a4a', fontWeight: 600 },
  statValue: { fontSize: 24, fontWeight: 900, lineHeight: 1, color: '#2c2c2c' },
};
