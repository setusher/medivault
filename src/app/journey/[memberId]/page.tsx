'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  collection, getDocs, orderBy, query,
  doc, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirestoreDB, getFirebaseAuth } from '@/lib/firebase';

type MetricDoc = { id: string; date?: string; HRV?: number; RHR?: number; Sleep?: number };
type LabDoc    = { id: string; date?: string; title?: string; note?: string; type?: string };
type DayPoint  = { x: number; y: number };
type Series    = { name: string; points: DayPoint[]; min: number; max: number };

function toDate(d?: string) { if (!d) return null; const t = new Date(d); return isNaN(+t) ? null : t; }
function fmt(d?: Date|null) { return d ? d.toLocaleDateString() : ''; }

// Same base as chats page
const BASE = new Date(2025, 8, 17);
function weekFromDate(d: Date) {
  const ms = d.getTime() - BASE.getTime();
  return Math.max(1, Math.floor(ms / (7 * 24 * 3600 * 1000)) + 1);
}

function coerceNumber(v: any): number | undefined {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function makeSeries(name: keyof MetricDoc, raw: MetricDoc[]): Series {
  const pts: DayPoint[] = [];
  let lo = +Infinity, hi = -Infinity;
  raw.forEach((m, i) => {
    const v = coerceNumber((m as any)[name]);
    if (typeof v === 'number') { pts.push({ x: i, y: v }); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  });
  if (lo === +Infinity) { lo = 0; hi = 1; }
  return { name: String(name), points: pts, min: lo, max: hi };
}

function polyline(series: Series, w=600, h=120) {
  if (!series.points.length) return '';
  const xMax = series.points[series.points.length - 1].x || 1;
  const yMin = series.min, yMax = series.max || 1;
  const map = (p: DayPoint) => {
    const x = (p.x / Math.max(1, xMax)) * (w - 20) + 10;
    const y = h - 10 - ((p.y - yMin) / Math.max(1e-6, yMax - yMin)) * (h - 20);
    return `${x},${y}`;
  };
  return series.points.map(map).join(' ');
}

/** Flatten different shapes into an array of MetricDoc */
function normalizeMetricDoc(d: any): MetricDoc[] {
  if (!d) return [];
  // 1) Array field (e.g., { items: [ {...}, {...} ] })
  if (Array.isArray(d)) {
    return d.map((x, i) => ({ id: String(i), ...(x || {}) }));
  }
  if (Array.isArray(d.items)) {
    return d.items.map((x: any, i: number) => ({ id: x?.id || String(i), ...(x || {}) }));
  }
  // 2) Map of entries { "metric_20260119": {...}, "metric_20260120": {...} }
  const rows: MetricDoc[] = [];
  if (typeof d === 'object') {
    for (const [k, v] of Object.entries(d)) {
      // Only pick objects that look like metric rows
      if (v && typeof v === 'object' && (
        'HRV' in (v as any) || 'RHR' in (v as any) || 'Sleep' in (v as any) || 'date' in (v as any)
      )) {
        rows.push({ id: k, ...(v as any) });
      }
    }
  }
  return rows;
}

/** Flatten different shapes into an array of LabDoc */
function normalizeLabDoc(d: any): LabDoc[] {
  if (!d) return [];
  if (Array.isArray(d)) {
    return d.map((x, i) => ({ id: String(i), ...(x || {}) }));
  }
  if (Array.isArray(d.items)) {
    return d.items.map((x: any, i: number) => ({ id: x?.id || String(i), ...(x || {}) }));
  }
  const rows: LabDoc[] = [];
  if (typeof d === 'object') {
    for (const [k, v] of Object.entries(d)) {
      if (v && typeof v === 'object' && ('date' in (v as any) || 'title' in (v as any) || 'type' in (v as any))) {
        rows.push({ id: k, ...(v as any) });
      }
    }
  }
  return rows;
}

export default function JourneyPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const db = useMemo(() => getFirestoreDB(), []);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<{ uid: string; email?: string | null } | null>(null);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricDoc[]>([]);
  const [labs, setLabs] = useState<LabDoc[]>([]);
  const [pathInfo, setPathInfo] = useState<string>('');
  const [q, setQ] = useState('');
  const [ans, setAns] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  // auth gate
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

  const accessOk = !!me && me.uid === String(memberId);

  useEffect(() => {
    if (!accessOk) return;
    (async () => {
      setLoading(true);
      try {
        // ---------------- METRICS ----------------
        let m = [] as MetricDoc[];
        let mPathTried: string[] = [];

        // A) Try subcollection: /users/{uid}/meta/metrics/metrics
        try {
          const mCol = collection(db, 'users', memberId, 'meta', 'metrics', 'metrics');
          mPathTried.push(`/users/${memberId}/meta/metrics/metrics`);
          const snap = await getDocs(query(mCol, orderBy('date', 'asc')));
          m = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        } catch {/* ignore */}

        // B) If still empty, try single doc with array/map: /users/{uid}/meta/metrics
        if (m.length === 0) {
          try {
            mPathTried.push(`/users/${memberId}/meta/metrics (doc)`);
            const mDoc = await getDoc(doc(db, 'users', memberId, 'meta', 'metrics'));
            if (mDoc.exists()) {
              const normalized = normalizeMetricDoc(mDoc.data());
              // sort by date if present
              m = normalized.sort((a,b) => {
                const ta = toDate(a.date)?.getTime() ?? 0;
                const tb = toDate(b.date)?.getTime() ?? 0;
                return ta - tb;
              });
            }
          } catch {/* ignore */}
        }

        setMetrics(m);

        // ---------------- LABS ----------------
        let l = [] as LabDoc[];
        let lPathTried: string[] = [];

        // A) Try subcollection: /users/{uid}/meta/labs/labs
        try {
          const lCol = collection(db, 'users', memberId, 'meta', 'labs', 'labs');
          lPathTried.push(`/users/${memberId}/meta/labs/labs`);
          const snap = await getDocs(query(lCol, orderBy('date', 'asc')));
          l = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        } catch {/* ignore */}

        // B) Try single doc: /users/{uid}/meta/labs
        if (l.length === 0) {
          try {
            lPathTried.push(`/users/${memberId}/meta/labs (doc)`);
            const lDoc = await getDoc(doc(db, 'users', memberId, 'meta', 'labs'));
            if (lDoc.exists()) {
              const normalized = normalizeLabDoc(lDoc.data());
              l = normalized.sort((a,b) => {
                const ta = toDate(a.date)?.getTime() ?? 0;
                const tb = toDate(b.date)?.getTime() ?? 0;
                return ta - tb;
              });
            }
          } catch {/* ignore */}
        }

        setLabs(l);

        setPathInfo(
          `Metrics: ${m.length} • tried ${mPathTried.join(' → ')}  |  Labs: ${l.length} • tried ${lPathTried.join(' → ')}`
        );
      } finally { setLoading(false); }
    })();
  }, [db, memberId, accessOk]);

  async function askWhy() {
    start(async () => {
      const payload = {
        question: q || 'What decisions this period and why?',
        context: { memberId, labs, metrics }
      };
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setAns(data.text || data.error || 'No answer');
    });
  }

  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;

  if (me && !accessOk) {
    return (
      <main style={S.wrap}>
        <header style={S.header}>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <Link href="/" style={S.back}>← Home</Link>
            <div style={{fontWeight:800}}>Journey • {memberId}</div>
          </div>
        </header>
        <div style={S.banner}>You’re signed in as <b>{me.uid}</b> but viewing <b>{memberId}</b>. Switch accounts or change the URL.</div>
      </main>
    );
  }

  const sHRV  = makeSeries('HRV',  metrics);
  const sRHR  = makeSeries('RHR',  metrics);
  const sSlp  = makeSeries('Sleep',metrics);

  return (
    <main style={S.wrap}>
      <header style={S.header}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <Link href="/" style={S.back}>← Home</Link>
          <div style={{fontWeight:800}}>Journey • {memberId}</div>
        </div>
        <div style={{opacity:0.8,fontSize:13}}>
          {fmt(toDate(metrics[0]?.date))} – {fmt(toDate(metrics[metrics.length-1]?.date))}
        </div>
      </header>

      {pathInfo && <div style={S.debug}>{pathInfo}</div>}
      {loading && <div style={{padding:16}}>Loading…</div>}

      {!loading && (
        <div style={S.body}>
          <section style={S.card}>
            <h3 style={S.h3}>Vitals (trend)</h3>
            <MetricChart label={`HRV • min ${sHRV.min} max ${sHRV.max}`} poly={polyline(sHRV)} />
            <MetricChart label={`RHR • min ${sRHR.min} max ${sRHR.max}`} poly={polyline(sRHR)} />
            <MetricChart label={`Sleep • min ${sSlp.min} max ${sSlp.max}`} poly={polyline(sSlp)} />
          </section>

          <section style={S.card}>
            <h3 style={S.h3}>Diagnostics & Labs (the “why”)</h3>
            <div style={{display:'grid',gap:8}}>
              {labs.length === 0 && <div style={{opacity:0.7}}>No labs added yet.</div>}
              {labs.map(l => {
                const d = toDate(l.date || '');
                const wk = d ? weekFromDate(d) : undefined;
                return (
                  <div key={l.id} style={S.labRow}>
                    <div>
                      <div style={S.labTitle}>{l.title ?? l.type ?? 'Diagnostic'}</div>
                      <div style={S.labMeta}>{l.date} • {l.id}</div>
                      {l.note && <div style={S.labNote}>{l.note}</div>}
                    </div>
                    {wk && (
                      <Link href={`/chats/${memberId}/${String(wk)}`} style={S.linkBtn}>
                        Open Week {wk} chat
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Insights */}
            <div style={{display:'grid', gap:8, marginTop:12}}>
              <div style={{fontSize:12, opacity:0.7}}>Ask an insight:</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr auto', gap:8}}>
                <input value={q} onChange={e=>setQ(e.target.value)}
                  placeholder="e.g., Why did we plan diagnostics around 19 Jan?"
                  style={{padding:'10px 12px', border:'1px solid rgba(0,0,0,0.12)', borderRadius:8}}/>
                <button onClick={askWhy} disabled={isPending}
                  style={{padding:'10px 12px', border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, background:'#111', color:'#fff', fontWeight:700}}>
                  {isPending ? 'Thinking…' : 'Ask'}
                </button>
              </div>
              {ans && <div style={{whiteSpace:'pre-wrap', background:'#F6F7F9', border:'1px solid rgba(0,0,0,0.06)', borderRadius:8, padding:12}}>{ans}</div>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function MetricChart({ label, poly }: { label: string; poly: string }) {
  return (
    <div style={{display:'grid',gap:6}}>
      <div style={{fontSize:12,opacity:0.9}}>{label}</div>
      <svg width={600} height={120} style={{maxWidth:'100%',height:120,background:'#fff',border:'1px solid rgba(0,0,0,0.06)',borderRadius:8}}>
        <polyline points={poly} fill="none" stroke="#00A884" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight:'100vh', background:'linear-gradient(#ECECEC, #E7F1ED)', display:'grid', gridTemplateRows:'56px auto' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 12px', background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.06)' },
  back: { textDecoration:'none', color:'#111', padding:'6px 10px', border:'1px solid rgba(0,0,0,0.08)', borderRadius:8, background:'#fff' },
  debug: { background:'#fff8d6', border:'1px solid #f1d36b', color:'#5c4a00', padding:'8px 12px', margin:'8px auto', borderRadius:8, maxWidth:900, fontSize:12 },
  body: { padding:12, display:'grid', gap:12, maxWidth:900, margin:'0 auto 24px' },
  card: { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:12, boxShadow:'0 1px 2px rgba(0,0,0,0.05)' },
  h3: { margin:'4px 0 8px', fontSize:16 },
  banner: { maxWidth:600, margin:'10vh auto', background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:24 },
  labRow: { display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', border:'1px dashed rgba(0,0,0,0.08)', borderRadius:10, padding:'10px 12px' },
  labTitle: { fontWeight:700 },
  labMeta: { fontSize:12, opacity:0.7 },
  labNote: { fontSize:13, marginTop:4 },
  linkBtn: { textDecoration:'none', padding:'8px 10px', border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, background:'#00A884', color:'#fff', fontWeight:700 }
};
