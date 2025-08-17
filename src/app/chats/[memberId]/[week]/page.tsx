
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  collection, addDoc, serverTimestamp, onSnapshot,
  query, orderBy, limit, getDocs, doc, DocumentData
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';

/* ------------ types & helpers ------------ */

type Msg = {
  id: string;
  text?: string;
  message?: string;
  content?: string | { text?: string };
  role?: 'patient' | 'doctor' | 'user' | 'assistant' | string;
  sender?: string;
  senderName?: string;
  name?: string;
  author?: string;
  from?: string;
  displayName?: string;
  uid?: string | null;
  userId?: string | null;
  memberId?: string | null;
  createdAt?: any;
  timestamp?: any;
  time?: any;
  date?: any;
  [k: string]: any;
};

function toDateSafe(anyTs: any): Date | undefined {
  if (!anyTs) return undefined;
  if (anyTs?.toDate) return anyTs.toDate();
  if (typeof anyTs?.seconds === 'number') return new Date(anyTs.seconds * 1000);
  if (typeof anyTs === 'number') return new Date(anyTs);
  if (typeof anyTs === 'string') {
    const d = new Date(anyTs);
    if (!isNaN(+d)) return d;
  }
  return undefined;
}

function coerceText(m: Msg): string {
  if (typeof m.content === 'object' && m.content?.text) return String(m.content.text);
  return String(m.text ?? m.message ?? m.content ?? m.body ?? m.msg ?? '');
}

function coerceRole(m: Msg): string {
  const r = (m.role ?? m.sender ?? '').toString().toLowerCase();
  if (r === 'patient' || r === 'user') return 'patient';
  if (r === 'doctor' || r === 'assistant' || r === 'coach' || r === 'team') return 'doctor';
  return r || '';
}

function coerceDate(m: Msg): Date | undefined {
  return (
    toDateSafe(m.createdAt) ??
    toDateSafe(m.timestamp) ??
    toDateSafe(m.time) ??
    toDateSafe(m.date)
  );
}

function coerceName(m: Msg, fallbackIfMember?: string): string {
  const n = m.senderName ?? m.displayName ?? m.name ?? m.author ?? m.from ?? m.sender;
  if (n && String(n).trim()) {
    const name = String(n).trim();
    if (name.toLowerCase() === 'member') return 'Rohan Patel';
    return name;
  }
  return fallbackIfMember ?? (coerceRole(m) === 'patient' ? 'Rohan Patel' : 'Elyx Team');
}

// Calculate week dates starting from September 17, 2025
function getWeekDateRange(weekNumber: string): { start: Date; end: Date } {
  const baseDate = new Date(2025, 8, 17);
  const weekNum = parseInt(weekNumber) - 1;
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() + (weekNum * 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function dayKey(d?: Date) {
  if (!d) return 'unknown';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function sortByTime(a: Msg, b: Msg) {
  const ta = coerceDate(a)?.getTime() ?? -1;
  const tb = coerceDate(b)?.getTime() ?? -1;
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
}

function formatDayHeading(d?: Date) {
  if (!d) return 'Unknown date';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    day: 'numeric', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
}

/** member message (RIGHT) vs team (LEFT) */
function isMemberMsg(m: Msg): boolean {
  const senderName = (m.senderName ?? m.displayName ?? m.name ?? m.author ?? m.from ?? m.sender ?? '').toString().toLowerCase();
  if (senderName.includes('member')) return true;
  const role = coerceRole(m);
  return role === 'patient' || role === 'user';
}

/* -------------- page component -------------- */

export default function ChatPage() {
  const { memberId, week } = useParams<{ memberId: string; week: string }>();
  const router = useRouter();

  const memberLabel = 'Rohan Patel';
  const teamLabel = 'Elyx Team';
  const db = useMemo(() => getFirestoreDB(), []);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<{ uid: string; email?: string | null } | null>(null);

  const [weeks, setWeeks] = useState<string[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [subMessages, setSubMessages] = useState<Msg[]>([]);
  const [arrayMessages, setArrayMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Prompt Lab
  const [labOpen, setLabOpen] = useState(false);
  const [labSeed, setLabSeed] = useState<string | undefined>(undefined);

  /* ---- auth gate ---- */
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

  /* ---- load list of weeks for picker ---- */
  useEffect(() => {
    if (!memberId) return;
    (async () => {
      const weeksCol = collection(db, 'users', memberId, 'weeks');
      const snap = await getDocs(weeksCol);
      const ids = snap.docs.map(d => d.id);
      ids.sort((a, b) => Number(a) - Number(b));
      setWeeks(ids);
    })();
  }, [db, memberId]);

  /* ---- subscribe to subcollection messages ---- */
  useEffect(() => {
    if (!memberId || !week) return;
    const msgsCol = collection(db, 'users', memberId, 'weeks', week, 'messages');
    const qSub = query(msgsCol, orderBy('createdAt', 'asc'), limit(5000));
    const unsub = onSnapshot(
      qSub,
      (snap) => {
        const rows: Msg[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) }));
        setSubMessages(rows);
      },
      () => setSubMessages([])
    );
    return () => unsub();
  }, [db, memberId, week]);

  /* ---- subscribe to week doc (messages array) ---- */
  useEffect(() => {
    if (!memberId || !week) return;
    const weekDocRef = doc(db, 'users', memberId, 'weeks', week);
    const unsub = onSnapshot(
      weekDocRef,
      (snap) => {
        if (!snap.exists()) { setArrayMessages([]); return; }
        const data = snap.data() as any;
        const arr: any[] = Array.isArray(data?.messages) ? data.messages : [];
        const rows: Msg[] = arr.map((m, i) => ({ id: `arr-${i}`, ...(m as Record<string, any>) }));
        setArrayMessages(rows);
      },
      () => setArrayMessages([])
    );
    return () => unsub();
  }, [db, memberId, week]);

  /* ---- merge both sources ---- */
  useEffect(() => {
    const seen = new Set<string>();
    const merged: Msg[] = [];
    const pushUnique = (m: Msg) => {
      const key = [
        coerceText(m),
        coerceRole(m),
        coerceDate(m)?.getTime() ?? '',
        (m.uid ?? m.userId ?? m.memberId ?? '')
      ].join('|');
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(m);
      }
    };
    arrayMessages.forEach(pushUnique);
    subMessages.forEach(pushUnique);
    merged.sort(sortByTime);
    setMessages(merged);
    setTimeout(() => scrollerRef.current?.scrollTo({ top: 9e6, behavior: 'smooth' }), 0);
  }, [arrayMessages, subMessages]);

  /* ---- Prompt Lab context (last ~200 msgs, trimmed) ---- */
  const weekRange = week ? getWeekDateRange(week) : null;
  const weekDateText = weekRange ? `${weekRange.start.toLocaleDateString()} - ${weekRange.end.toLocaleDateString()}` : '';

  const labContext = useMemo(() => {
    const maxChars = 12000;
    const header = [
      `Member: ${memberLabel} (id: ${memberId})`,
      `Week: ${week} (${weekDateText})`,
      `Messages (oldest → newest)`,
      `----------------------------------------`,
    ].join('\n');

    const recent = messages.slice(-200);
    const lines = recent.map((m) => {
      const ts = coerceDate(m)?.toLocaleString() ?? 'unknown';
      const name = coerceName(m, isMemberMsg(m) ? memberLabel : teamLabel);
      const text = coerceText(m).replace(/\s+/g, ' ').trim();
      return `${ts} — ${name}: ${text}`;
    });

    let ctx = `${header}\n${lines.join('\n')}`;
    if (ctx.length > maxChars) ctx = ctx.slice(-maxChars);
    return ctx;
  }, [messages, memberId, week, weekDateText]);

  /* ---- sending ---- */
  const sending = useRef(false);
  const send = async () => {
    if (!text.trim() || sending.current || !memberId || !week) return;
    sending.current = true;
    try {
      const msgsCol = collection(db, 'users', memberId, 'weeks', week, 'messages');
      await addDoc(msgsCol, {
        text: text.trim(),
        role: 'patient',
        uid: me?.uid ?? memberId ?? null,
        createdAt: serverTimestamp(),
        senderName: 'Member',
      });
      setText('');
    } finally {
      sending.current = false;
      setTimeout(() => scrollerRef.current?.scrollTo({ top: 9e6, behavior: 'smooth' }), 60);
    }
  };

  /* ---- UI ---- */
  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;

  if (!me) {
    return (
      <main style={S.wrap}>
        <div style={S.centerCard}>
          <h3 style={{ marginTop: 0 }}>Please sign in to view chats</h3>
        </div>
      </main>
    );
  }

  // Build render list with date separators
  const renderItems: Array<{ type: 'date'; key: string; date?: Date } | { type: 'msg'; key: string; msg: Msg }> = [];
  let lastDay = '';
  for (const m of messages) {
    const d = coerceDate(m);
    const dk = dayKey(d);
    if (d && dk !== lastDay && dk !== 'unknown') {
      renderItems.push({ type: 'date', key: `date-${dk}`, date: d });
      lastDay = dk;
    }
    renderItems.push({ type: 'msg', key: m.id, msg: m });
  }

  return (
    <main style={S.wrap}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <Link href="/" style={S.backButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div style={S.avatar}><span style={S.avatarText}>ET</span></div>
          <div style={S.headerInfo}>
            <div style={S.contactName}>{teamLabel}</div>
            <div style={S.weekInfo}>Week {week} • {weekDateText}</div>
          </div>
        </div>

        {/* Week picker */}
        <select
          value={String(week)}
          onChange={(e) => router.push(`/chats/${memberId}/${e.target.value}`)}
          style={S.select}
        >
          {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
        </select>
      </header>

      {/* Messages */}
      <div ref={scrollerRef} style={S.scroller}>
        <div style={S.inner}>
          {renderItems.map((item) => {
            if (item.type === 'date') {
              return <DateChip key={item.key} text={formatDayHeading(item.date)} />;
            }
            const m = item.msg;
            const when = coerceDate(m);
            const mine = isMemberMsg(m);
            const name = coerceName(m, mine ? memberLabel : teamLabel);
            const text = coerceText(m);

            return (
              <ChatBubble
                key={item.key}
                mine={mine}
                name={name}
                text={text}
                ts={when}
              />
            );
          })}
          {messages.length === 0 && (
            <div style={S.emptyState}>
              <div style={S.emptyIcon}>💬</div>
              <div>No messages for this week yet</div>
              <div style={S.emptySubtext}>Start the conversation!</div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <footer style={S.composer}>
        <div style={S.inputContainer}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder="Type a message"
            style={S.input}
          />
          <button 
            onClick={send} 
            style={text.trim() ? S.sendBtnActive : S.sendBtn}
            disabled={!text.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </footer>

      {/* ------- Prompt Lab FAB & Sheet ------- */}
      <button
        style={S.fab}
        title="Prompt Lab"
        onClick={() => { setLabSeed(undefined); setLabOpen(true); }}
        aria-label="Open Prompt Lab"
      >
        🧪
      </button>

      <PromptLab
        open={labOpen}
        onClose={() => setLabOpen(false)}
        context={labContext}
        seedQuestion={labSeed}
      />
    </main>
  );
}

/* ----- date chip ----- */
function DateChip({ text }: { text: string }) {
  return (
    <div style={D.container}>
      <div style={D.chip}>{text}</div>
    </div>
  );
}

/* ----- bubble ----- */
function ChatBubble({ mine, name, text, ts }: { mine: boolean; name: string; text: string; ts?: Date }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: mine ? 'flex-end' : 'flex-start',
      marginBottom: 2 
    }}>
      <div style={{ 
        ...B.bubble, 
        ...(mine ? B.mine : B.other),
        position: 'relative'
      }}>
        <div style={mine ? B.tailMine : B.tailOther} />
        {!mine && name !== 'Rohan Patel' && <div style={B.senderName}>{name}</div>}
        <div style={B.text}>{text}</div>
        <div style={B.timestamp}>
          {ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          {mine && (
            <span style={B.checkmarks}>
              <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                <path d="M11.071 0.929L5.414 6.586L8.929 10.1L14.586 4.443L11.071 0.929Z" fill="#4FC3F7"/>
                <path d="M5.071 0.929L-0.586 6.586L2.929 10.1L8.586 4.443L5.071 0.929Z" fill="#4FC3F7"/>
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Prompt Lab (inline component) ---------- */
function PromptLab({
  open, onClose, seedQuestion, context
}: {
  open: boolean;
  onClose: () => void;
  seedQuestion?: string;
  context: string;
}) {
  const [q, setQ] = useState(seedQuestion ?? '');
  const [ans, setAns] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (seedQuestion) setQ(seedQuestion); }, [seedQuestion]);

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
        body: JSON.stringify({
          question: q.trim(),
          context,
          system: `You are Prompt Lab, a brief clinical coach. Answer concisely, use bullets where helpful.`
        }),
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
    <div style={PL.overlay} onClick={onClose}>
      <div style={PL.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={PL.header}>
          <div style={PL.titleRow}>
            <span>🧪</span> <span>Prompt Lab</span>
          </div>
          <button onClick={onClose} style={PL.x} aria-label="Close Prompt Lab">✕</button>
        </div>

        <div style={PL.quick}>
          <button onClick={() => setQ('What changed in this week’s conversation and what should the member do next?')} style={PL.quickBtn}>What changed?</button>
          <button onClick={() => setQ('List possible risks or red flags the team is addressing this week.')} style={PL.quickBtn}>Risks</button>
          <button onClick={() => setQ('Summarize the week’s plan and give 3 clear action items for the member.')} style={PL.quickBtn}>Summary & actions</button>
        </div>

        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about the chat…"
          style={PL.ta}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={ask} disabled={loading || !q.trim()} style={PL.ask}>
            {loading ? 'Thinking…' : 'Ask'}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(context)}
            style={PL.secondary}
            title="Copy current chat context"
          >
            Copy context
          </button>
        </div>

        {!!err && <div style={PL.err}>{err}</div>}
        {!!ans && (
          <div style={PL.answer} dangerouslySetInnerHTML={{ __html: ans.replace(/\n/g, '<br/>') }} />
        )}
      </div>
    </div>
  );
}

/* ---------------- WhatsApp-style colors & styles ---------------- */

const C = {
  primary: '#00A884',
  primaryDark: '#008069',
  incoming: '#FFFFFF',
  outgoing: '#D1F4CC',
  bg: '#E5DDD5',
  header: '#00A884',
  text: '#111B21',
  textSecondary: '#667781',
  border: 'rgba(0, 0, 0, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.13)',
};

const S: Record<string, React.CSSProperties> = {
  wrap: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: `linear-gradient(to bottom, ${C.bg} 0%, #D9DBD5 100%)`,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: C.header,
    color: 'white',
    boxShadow: `0 1px 2px ${C.shadow}`,
    minHeight: '64px',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
  backButton: {
    color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center',
    padding: '8px', borderRadius: '50%', transition: 'background-color 0.2s',
  },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: '16px', fontWeight: '600', color: 'white' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  contactName: { fontSize: '17px', fontWeight: '500', color: 'white' },
  weekInfo: { fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' },
  select: {
    padding: '8px 12px', borderRadius: '8px', border: 'none',
    background: 'rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '14px', cursor: 'pointer',
  },
  scroller: { flex: 1, overflowY: 'auto', background: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23E5DDD5\'/%3E%3C/svg%3E")' },
  inner: { padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '100%' },
  composer: { padding: '12px 16px', background: C.header, borderTop: `1px solid ${C.border}` },
  inputContainer: { display: 'flex', alignItems: 'flex-end', gap: '8px', background: 'white', borderRadius: '24px', padding: '6px' },
  input: { flex: 1, border: 'none', outline: 'none', padding: '12px 16px', fontSize: '15px', background: 'transparent', resize: 'none', maxHeight: '100px' },
  sendBtn: {
    width: '44px', height: '44px', borderRadius: '50%', border: 'none',
    background: C.textSecondary, color: 'white', cursor: 'not-allowed',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
  },
  sendBtnActive: {
    width: '44px', height: '44px', borderRadius: '50%', border: 'none',
    background: C.primary, color: 'white', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', transform: 'scale(1)',
  },
  emptyState: {
    textAlign: 'center' as const, color: C.textSecondary, padding: '40px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    marginTop: 'auto', marginBottom: 'auto',
  },
  emptyIcon: { fontSize: '48px', marginBottom: '16px' },
  emptySubtext: { fontSize: '14px', opacity: 0.7 },
  centerCard: {
    margin: '10vh auto', maxWidth: 420, background: '#fff', border: `1px solid ${C.border}`,
    borderRadius: 16, padding: 24, textAlign: 'center' as const,
  },

  // FAB for Prompt Lab
  fab: {
    position: 'fixed', right: 16, bottom: 16, width: 54, height: 54,
    borderRadius: '50%', border: 'none', background: '#111B21', color: '#ffffff',
    boxShadow: '0 10px 24px rgba(0,0,0,0.25)', fontSize: 22, cursor: 'pointer', zIndex: 50,
  },
};

const B: Record<string, React.CSSProperties> = {
  bubble: {
    maxWidth: '80%', minWidth: '80px', padding: '8px 12px 6px', borderRadius: '8px',
    position: 'relative', wordWrap: 'break-word', boxShadow: `0 1px 0.5px ${C.shadow}`,
  },
  mine: { background: C.outgoing, marginLeft: '20%', borderBottomRightRadius: '2px' },
  other: { background: C.incoming, marginRight: '20%', borderBottomLeftRadius: '2px' },
  tailMine: {
    position: 'absolute', right: '-6px', bottom: '0px', width: 0, height: 0,
    borderLeft: '6px solid ' + C.outgoing, borderBottom: '8px solid transparent',
  },
  tailOther: {
    position: 'absolute', left: '-6px', bottom: '0px', width: 0, height: 0,
    borderRight: '6px solid ' + C.incoming, borderBottom: '8px solid transparent',
  },
  senderName: { fontSize: '13px', fontWeight: 600, color: C.primary, marginBottom: '2px' },
  text: { color: C.text, lineHeight: 1.4, fontSize: '14px', marginBottom: '4px', whiteSpace: 'pre-wrap' },
  timestamp: { fontSize: '11px', color: C.textSecondary, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '2px' },
  checkmarks: { display: 'flex', alignItems: 'center' },
};

const D: Record<string, React.CSSProperties> = {
  container: { display: 'flex', justifyContent: 'center', margin: '16px 0 8px' },
  chip: {
    fontSize: '12px', fontWeight: 500, padding: '6px 12px', borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.9)', color: C.textSecondary, boxShadow: `0 1px 2px ${C.shadow}`,
    backdropFilter: 'blur(10px)',
  }
};

/* --------- Prompt Lab styles (high contrast) --------- */
const DARK_TEXT = '#0b141a';         // WhatsApp-like dark text
const MID_TEXT  = '#1f2937';         // headings / emphasis
const BORDER    = '#c5ccd3';         // stronger border
const PANEL_BG  = '#ffffff';

const PL: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'end center', zIndex: 1000 },
  sheet: {
    width: 'min(780px, 94vw)', background: PANEL_BG, border: `1px solid ${BORDER}`,
    borderRadius: 14, margin: 12, padding: 12, boxShadow: '0 10px 28px rgba(0,0,0,0.18)', color: DARK_TEXT
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: MID_TEXT, fontSize: 16 },
  x: {
    border: `1px solid ${BORDER}`, background: PANEL_BG, color: DARK_TEXT,
    borderRadius: 8, padding: '4px 10px', cursor: 'pointer'
  },
  quick: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  quickBtn: {
    padding: '6px 10px', borderRadius: 999, border: `1px solid ${BORDER}`,
    background: '#eef2f6', cursor: 'pointer', color: DARK_TEXT, fontWeight: 600
  },
  ta: {
    width: '100%', minHeight: 80, borderRadius: 10, border: `1px solid ${BORDER}`,
    padding: 10, margin: '8px 0', color: DARK_TEXT, background: '#fcfcfc'
  },
  ask: {
    padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`,
    background: '#00A884', color: '#fff', fontWeight: 800, cursor: 'pointer'
  },
  secondary: {
    padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`,
    background: PANEL_BG, cursor: 'pointer', color: DARK_TEXT, fontWeight: 600
  },
  answer: {
    marginTop: 12, padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`,
    background: '#fff', lineHeight: 1.55, color: DARK_TEXT
  },
  err: { marginTop: 8, color: '#b00020', fontSize: 13 },
};
