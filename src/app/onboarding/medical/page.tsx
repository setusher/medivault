'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/* ---------------------------- Types & helpers ---------------------------- */

type MedicalProfile = {
  fullName?: string;
  dob?: string;
  biologicalSex?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  timezone?: string;
  cityCountry?: string;
  primaryChannel?: string;
  language?: string;
  topGoals?: string[];
  successDefinition?: string;
  conditions?: string[];
  medsFreeText?: string;
  allergiesFreeText?: string;
  familyHistoryBrief?: string;
  rhr?: number | null;
  bpSys?: number | null;
  bpDia?: number | null;
  uploads?: Array<{ name: string; url: string; path: string }>;
  updatedAt?: any;
};

const palette = {
  bgA: '#d8e2dc',
  bgB: '#ffe5d9',
  text: '#9d8189',
  accentA: '#f4acb7',
  accentB: '#ffcad4',
};
const alpha = (hex: string, a: number) => {
  const c = Number.parseInt(hex.replace('#', ''), 16);
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return `rgba(${r},${g},${b},${a})`;
};
const pretty = {
  card: (p = 1) => ({
    background: `rgba(255,255,255,${p})`,
    borderRadius: 20,
    border: `1px solid ${alpha(palette.accentA, 0.25)}`,
    boxShadow: '0 20px 40px rgba(157,129,137,.12)',
  }),
};

function parseNum(v: any): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function splitCsv(s: string | undefined): string[] {
  return (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/* --------------------------------- Page --------------------------------- */

export default function MedicalOnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const db = useMemo(() => getFirestoreDB(), []);

  const [me, setMe] = useState<{ email?: string | null } | null>(null);
  const [initial, setInitial] = useState<MedicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // form state (controlled)
  const [form, setForm] = useState<MedicalProfile>({
    fullName: '',
    dob: '',
    biologicalSex: '',
    heightCm: null,
    weightKg: null,
    timezone: '',
    cityCountry: '',
    primaryChannel: '',
    language: '',
    topGoals: [],
    successDefinition: '',
    conditions: [],
    medsFreeText: '',
    allergiesFreeText: '',
    familyHistoryBrief: '',
    rhr: null,
    bpSys: null,
    bpDia: null,
  });

  /* ------------------------------ Auth & load ----------------------------- */
  useEffect(() => {
    (async () => {
      const auth = await getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, (u) => {
        setMe(u ? { email: u.email } : null);
      });
      return () => unsub();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!me?.email) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      // 1) optional prefill from sessionStorage if query ?prefill=1
      let prefill: MedicalProfile | null = null;
      try {
        if (typeof window !== 'undefined' && params.get('prefill') === '1') {
          const raw = sessionStorage.getItem('mv_profile_prefill');
          if (raw) {
            prefill = JSON.parse(raw);
            sessionStorage.removeItem('mv_profile_prefill'); // one-time read
          }
        }
      } catch {}

      // 2) Firestore (authoritative)
      let remote: MedicalProfile | null = null;
      try {
        const memberId = me.email.split('@')[0];
        const ref = doc(db, 'users', memberId, 'meta', 'medicalProfile'); // even segments
        const snap = await getDoc(ref);
        if (snap.exists()) remote = snap.data() as any;
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile.');
      }

      const start = prefill || remote || null;
      setInitial(start);
      if (start) setForm({ ...form, ...start });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, me]);

  /* -------------------------------- Handlers ------------------------------ */
  const set = <K extends keyof MedicalProfile>(key: K) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = ev.target.value;
      if (key === 'heightCm' || key === 'weightKg' || key === 'rhr' || key === 'bpSys' || key === 'bpDia') {
        setForm((f) => ({ ...f, [key]: parseNum(val) }));
      } else if (key === 'topGoals' || key === 'conditions') {
        const arr = splitCsv(val);
        setForm((f) => ({ ...f, [key]: arr }));
      } else {
        setForm((f) => ({ ...f, [key]: val }));
      }
    };

  async function save() {
    if (!me?.email) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    // Basic validation
    if (!form.fullName?.trim()) { setSaving(false); setError('Please add your full name.'); return; }
    if (!form.dob?.trim()) { setSaving(false); setError('Please add your date of birth.'); return; }

    try {
      const memberId = me.email.split('@')[0];
      const ref = doc(db, 'users', memberId, 'meta', 'medicalProfile');
      const payload: MedicalProfile = {
        ...form,
        topGoals: form.topGoals || [],
        conditions: form.conditions || [],
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload, { merge: true });
      setSaved(true);
      // Optional: bounce back to the dashboard after a short delay
      setTimeout(() => router.push('/'), 650);
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------- UI ---------------------------------- */
  if (!me?.email) {
    return (
      <main style={ui.wrap}>
        <div style={{ ...pretty.card(0.95), padding: 40, maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: palette.text }}>Please sign in to continue.</p>
          <a href="/auth" style={ui.btnPrimary}>Go to Sign in</a>
        </div>
      </main>
    );
  }

  return (
    <main style={ui.wrap}>
      <div style={ui.container}>
        <header style={{ ...pretty.card(0.95), ...ui.header }}>
          <div style={ui.hIcon}><div style={ui.hIconInner}/></div>
          <div style={{ flex: 1 }}>
            <h1 style={ui.title}>Edit Medical Profile</h1>
            <p style={ui.subtitle}>Keep this up to date for better care</p>
          </div>
          <button onClick={() => router.push('/')} style={ui.btnGhost}>Back</button>
        </header>

        {loading ? (
          <div style={{ ...pretty.card(0.95), padding: 36, textAlign: 'center' }}>
            <div style={ui.loadingBox}/>
            <p style={{ color: palette.text, marginTop: 12 }}>Loading form…</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); save(); }}
            style={{ ...pretty.card(0.98), padding: 24 }}
          >
            {error && (
              <div style={ui.alertError}>{error}</div>
            )}
            {saved && (
              <div style={ui.alertOk}>Saved! Taking you back…</div>
            )}

            {/* --- Personal --- */}
            <Section title="Personal Information">
              <Grid>
                <Input label="Full Name *" value={form.fullName || ''} onChange={set('fullName')} />
                <Input label="Date of Birth *" type="date" value={form.dob || ''} onChange={set('dob')} />
                <Select
                  label="Biological Sex"
                  value={form.biologicalSex || ''}
                  onChange={set('biologicalSex')}
                  options={['', 'Female', 'Male', 'Intersex', 'Prefer not to say']}
                />
                <Input label="Timezone (e.g., Asia/Kolkata)" value={form.timezone || ''} onChange={set('timezone')} />
                <Input label="City, Country" value={form.cityCountry || ''} onChange={set('cityCountry')} />
                <Input label="Language" value={form.language || ''} onChange={set('language')} />
              </Grid>
            </Section>

            {/* --- Vitals --- */}
            <Section title="Vitals">
              <Grid>
                <Input label="Height (cm)" type="number" value={form.heightCm ?? ''} onChange={set('heightCm')} />
                <Input label="Weight (kg)" type="number" value={form.weightKg ?? ''} onChange={set('weightKg')} />
                <Input label="Resting HR (bpm)" type="number" value={form.rhr ?? ''} onChange={set('rhr')} />
                <Input label="BP Systolic" type="number" value={form.bpSys ?? ''} onChange={set('bpSys')} />
                <Input label="BP Diastolic" type="number" value={form.bpDia ?? ''} onChange={set('bpDia')} />
              </Grid>
            </Section>

            {/* --- Care Preferences & Goals --- */}
            <Section title="Care Preferences & Goals">
              <Grid>
                <Select
                  label="Preferred Contact"
                  value={form.primaryChannel || ''}
                  onChange={set('primaryChannel')}
                  options={['', 'WhatsApp', 'SMS', 'Phone', 'Email']}
                />
                <Input
                  label="Top Goals (comma separated)"
                  placeholder="Lose 5kg, Improve sleep, Train 5k"
                  value={(form.topGoals || []).join(', ')}
                  onChange={set('topGoals')}
                />
                <Input
                  label="Success Definition"
                  placeholder="How you’ll know the program worked"
                  value={form.successDefinition || ''}
                  onChange={set('successDefinition')}
                />
              </Grid>
            </Section>

            {/* --- Medical Info --- */}
            <Section title="Medical Information">
              <Grid>
                <Input
                  label="Conditions (comma separated)"
                  placeholder="Hypertension, Prediabetes"
                  value={(form.conditions || []).join(', ')}
                  onChange={set('conditions')}
                />
                <TextArea
                  label="Current Medications"
                  placeholder="Metformin 500mg …"
                  value={form.medsFreeText || ''}
                  onChange={set('medsFreeText')}
                />
                <TextArea
                  label="Allergies & Intolerances"
                  placeholder="Peanuts, Penicillin…"
                  value={form.allergiesFreeText || ''}
                  onChange={set('allergiesFreeText')}
                />
                <TextArea
                  label="Family History"
                  placeholder="Father: hypertension; Mother: thyroid…"
                  value={form.familyHistoryBrief || ''}
                  onChange={set('familyHistoryBrief')}
                />
              </Grid>
            </Section>

            <div style={ui.footerRow}>
              <button type="button" onClick={() => router.push('/')} style={ui.btnGhost}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={ui.btnPrimary}>
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

/* --------------------------------- Bits --------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={ui.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 16,
    }}>
      {children}
    </div>
  );
}
function Input({
  label, type = 'text', value, onChange, placeholder,
}: {
  label: string; type?: string; value: any;
  onChange: (e: any) => void; placeholder?: string;
}) {
  return (
    <label style={ui.field}>
      <span style={ui.label}>{label}</span>
      <input
        type={type}
        value={value as any}
        onChange={onChange}
        placeholder={placeholder}
        style={ui.input}
      />
    </label>
  );
}
function TextArea({
  label, value, onChange, placeholder,
}: {
  label: string; value: any; onChange: (e: any) => void; placeholder?: string;
}) {
  return (
    <label style={{ ...ui.field, gridColumn: '1 / -1' }}>
      <span style={ui.label}>{label}</span>
      <textarea
        value={value as any}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        style={{ ...ui.input, resize: 'vertical' as const }}
      />
    </label>
  );
}
function Select({
  label, value, onChange, options,
}: {
  label: string; value: any; onChange: (e: any) => void; options: string[];
}) {
  return (
    <label style={ui.field}>
      <span style={ui.label}>{label}</span>
      <select value={value || ''} onChange={onChange} style={ui.input}>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt || '—'}</option>
        ))}
      </select>
    </label>
  );
}

/* --------------------------------- Styles -------------------------------- */

const ui: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${palette.bgA}, ${palette.bgB})`,
    padding: '18px 12px',
    color: palette.text,
  },
  container: { maxWidth: 980, margin: '0 auto' },

  header: { display: 'flex', alignItems: 'center', gap: 16, padding: 18, marginBottom: 12 },
  hIcon: {
    width: 48, height: 48, borderRadius: 12,
    background: `linear-gradient(135deg, ${palette.accentA}, ${palette.accentB})`,
    display: 'grid', placeItems: 'center', flexShrink: 0,
    boxShadow: '0 8px 24px rgba(244,172,183,.35)',
  },
  hIconInner: { width: 20, height: 20, background: 'rgba(255,255,255,.55)', borderRadius: 6 },
  title: { margin: 0, fontSize: '1.6rem', fontWeight: 800, color: palette.text },
  subtitle: { margin: 0, opacity: 0.8 },

  sectionTitle: { margin: '8px 0 12px', fontSize: '1.1rem', fontWeight: 800, color: palette.text },

  field: { display: 'grid', gap: 8 },
  label: { fontSize: '.9rem', fontWeight: 700, opacity: 0.8 },
  input: {
    appearance: 'none',
    padding: '10px 12px',
    borderRadius: 12,
    border: `1px solid ${alpha('#000', 0.08)}`,
    outline: 'none',
    background: 'rgba(255,255,255,.9)',
    color: palette.text,
    boxShadow: '0 1px 0 rgba(255,255,255,.6) inset',
  },

  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '12px 18px',
    background: `linear-gradient(135deg, ${palette.accentA}, ${palette.accentB})`,
    color: palette.text,
    border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 10px 26px rgba(244,172,183,.45)',
    textDecoration: 'none',
  },
  btnGhost: {
    padding: '10px 14px',
    background: 'rgba(244,172,183,.2)',
    border: `2px solid ${alpha(palette.accentA, .45)}`,
    borderRadius: 12, color: palette.text, fontWeight: 700, cursor: 'pointer',
  },

  loadingBox: {
    width: 48, height: 48, background: `linear-gradient(135deg, ${palette.accentA}, ${palette.accentB})`,
    borderRadius: 12, margin: '0 auto',
  },

  alertError: {
    marginBottom: 12,
    padding: '10px 12px',
    borderRadius: 12,
    background: alpha('#a00', 0.08),
    border: '1px solid rgba(160,0,0,.25)',
    color: '#8c2f39',
    fontWeight: 600,
  },
  alertOk: {
    marginBottom: 12,
    padding: '10px 12px',
    borderRadius: 12,
    background: alpha('#2a8a3a', 0.08),
    border: '1px solid rgba(42,138,58,.25)',
    color: '#2f6f3a',
    fontWeight: 600,
  },

  footerRow: { display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8 },
};
