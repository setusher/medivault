'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDocs,
  doc,
  getFirestore,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';

type DecisionLink = { id?: string; type?: string };
type DecisionRaw = {
  id?: string;
  kind?: string;
  summary?: string;
  rationale?: string;
  links?: DecisionLink[] | Record<string, DecisionLink>;
  ts?: any;           // Firestore Timestamp | ISO string
  date?: any;         // sometimes present
  [k: string]: any;
};

type Decision = {
  weekId: string;
  when?: Date | null;
  id?: string;
  kind?: string;
  summary?: string;
  rationale?: string;
  links: DecisionLink[];
};

function toDateSafe(x: any): Date | null {
  if (!x) return null;
  if (typeof x?.toDate === 'function') return x.toDate();
  if (typeof x?.seconds === 'number') return new Date(x.seconds * 1000);
  const s = String(x);
  const d = new Date(s);
  return Number.isNaN(+d) ? null : d;
}

function asArray<T>(v: T[] | Record<string, T> | undefined | null): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.entries(v)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, val]) => val);
}

export default function DecisionsPage() {
  const db = useMemo(() => getFirestoreDB(), []);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<{ uid: string; email?: string | null } | null>(null);

  const [items, setItems] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState<string>('');

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
        const weeksCol = collection(db, 'users', memberId, 'weeks');
        const wSnap = await getDocs(weeksCol);

        const all: Decision[] = [];
        for (const w of wSnap.docs) {
          const weekId = w.id;
          const data = w.data() as any;
          const decs: DecisionRaw[] = asArray<DecisionRaw>(data?.decisions);

          for (const d of decs) {
            const when = toDateSafe(d.ts) || toDateSafe(d.date);
            const links = asArray<DecisionLink>(d.links);
            all.push({
              weekId,
              when,
              id: d.id,
              kind: d.kind,
              summary: d.summary,
              rationale: d.rationale,
              links,
            });
          }
        }

        all.sort((a, b) => (b.when?.getTime() ?? 0) - (a.when?.getTime() ?? 0));
        setItems(all);
        setDebug(`Loaded ${all.length} decisions from ${wSnap.size} week docs for ${memberId}`);
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
          <div style={S.title}>Decisions</div>
        </header>
        <div style={S.centerCard}>
          <div>Please sign in to view decisions.</div>
          <Link href="/auth" style={S.primary}>Go to sign in</Link>
        </div>
      </main>
    );
  }

  const memberId = me.email?.split('@')[0] ?? 'me';

  const openChatHref = (weekId: string, when?: Date | null) => {
    if (!when) return `/chats/${memberId}/${weekId}`;
    const iso = when.toISOString();
    return `/chats/${memberId}/${weekId}?jump=${encodeURIComponent(iso)}`;
  };

  return (
    <main style={S.wrap}>
      <header style={S.header}>
        <Link href="/" style={S.back}>← Home</Link>
        <div style={S.title}>Decisions • {memberId}</div>
        <div style={S.meta}>{items.length} total</div>
      </header>

      {debug && <div style={S.debug}>{debug}</div>}

      <section style={S.list}>
        {loading && <div style={S.empty}>Loading decisions…</div>}

        {!loading && items.length === 0 && (
          <div style={S.empty}>No decisions found.</div>
        )}

        {!loading && items.map((d, i) => {
          const whenTxt = d.when
            ? d.when.toLocaleString(undefined, { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
            : '—';

          return (
            <article key={`${d.weekId}-${d.id ?? i}`} style={C.card}>
              <div style={C.topRow}>
                <span style={C.kind}>{d.kind ?? 'Decision'}</span>
                <span style={C.when}>{whenTxt}</span>
              </div>

              {d.summary && <div style={C.summary}>{d.summary}</div>}
              {d.rationale && <div style={C.rationale}>{d.rationale}</div>}

              {d.links?.length > 0 && (
                <div style={C.links}>
                  {d.links.map((l, idx) => (
                    <span key={idx} style={C.linkPill}>
                      {l.type ?? 'link'}{l.id ? `: ${l.id}` : ''}
                    </span>
                  ))}
                </div>
              )}

              <div style={C.actions}>
                <Link href={openChatHref(d.weekId, d.when)} style={C.openBtn}>
                  Open chat (week {d.weekId}) →
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

/* ---------- styles (match your pastel theme) ---------- */
const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: '100vh', background: 'linear-gradient(135deg,#d8e2dc,#ffe5d9 50%,#ffcad4)', display: 'grid', gridTemplateRows: '56px auto' },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', background: '#f4acb7', borderBottom: '2px solid #9d8189' },
  back: { textDecoration: 'none', color: '#2c2c2c', padding: '6px 10px', fontWeight: 600, borderRadius: 8, background: '#fff', border: '1px solid #9d8189' },
  title: { fontWeight: 800, color: '#2c2c2c', flex: 1 },
  meta: { fontSize: 12, color: '#4a4a4a' },
  list: { padding: 12, display: 'grid', gap: 12, maxWidth: 980, margin: '0 auto 24px' },
  empty: { background: '#fff', border: '2px dashed #9d8189', borderRadius: 12, padding: 24, textAlign: 'center' as const, color: '#2c2c2c' },
  debug: { maxWidth: 980, margin: '8px auto 0', padding: '8px 12px', background: '#ffe5d9', border: '1px solid #9d8189', color: '#2c2c2c', borderRadius: 8, fontSize: 12 },
  centerCard: { margin: '10vh auto', maxWidth: 420, background: '#fff', border: '2px solid #9d8189', borderRadius: 16, padding: 24, textAlign: 'center' as const },
  primary: { display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#9d8189', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600 },
};

const C: Record<string, React.CSSProperties> = {
  card: { background: '#fff', border: '2px solid #9d8189', borderRadius: 14, padding: 14, boxShadow: '0 4px 8px rgba(157,129,137,.15)', display: 'grid', gap: 8 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  kind: { background: '#d8e2dc', border: '1px solid #9d8189', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#2c2c2c' },
  when: { fontSize: 12, color: '#4a4a4a' },
  summary: { fontWeight: 800, color: '#2c2c2c' },
  rationale: { color: '#2c2c2c', opacity: .9, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  links: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  linkPill: { background: '#ffe5d9', border: '1px solid #9d8189', padding: '2px 8px', borderRadius: 999, fontSize: 12 },
  actions: { display: 'flex', justifyContent: 'flex-end' },
  openBtn: { textDecoration: 'none', fontWeight: 700, color: '#2c2c2c', border: '1px solid #9d8189', background: '#d8e2dc', padding: '6px 10px', borderRadius: 8 },
};
