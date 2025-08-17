'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
} from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from '@/lib/firebase';

/* Shared palette & helpers */
const P = {
  p1: '#fadde1', p2: '#ffc4d6', p3: '#ffa6c1', p4: '#ff87ab', p5: '#ff5d8f',
  p6: '#ff97b7', p7: '#ffacc5', p8: '#ffcad4', p9: '#f4acb7',
};
const alpha = (hex: string, a = 0.5) => {
  const c = Number.parseInt(hex.replace('#', ''), 16);
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return `rgba(${r},${g},${b},${a})`;
};
const softGlow = (color: string, s = 0.5) =>
  `0 10px 28px ${alpha(color, s)}, 0 0 64px ${alpha(color, s * 0.6)}`;
const glassBorder = (o = 0.14): React.CSSProperties => ({
  border: `1px solid ${alpha('#ffffff', o)}`, backdropFilter: 'blur(18px)',
});
const glowPill = (a: string, b: string): React.CSSProperties => ({
  padding: '12px 18px', borderRadius: 14, fontWeight: 800, letterSpacing: .3,
  color: '#3c1d2a', textDecoration: 'none',
  background: `linear-gradient(135deg, ${a}, ${b})`, boxShadow: softGlow(b, .45),
});

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const auth = await getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      try { await sendEmailVerification(cred.user); } catch {}
      router.replace('/onboarding/medical');
    } catch (e: any) {
      setErr(e?.message ?? 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setErr(null);
    setBusy(true);
    try {
      const auth = await getFirebaseAuth();
      await signInWithPopup(auth, googleProvider);
      router.replace('/onboarding/medical');
    } catch (e: any) {
      setErr(e?.message ?? 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.wrap}>
      <div aria-hidden style={styles.bg} />
      <div style={{ ...styles.card, ...glassBorder(0.16) }} data-raise>
        <div style={styles.header}>
          <div style={{ ...styles.logo, background: `linear-gradient(135deg, ${P.p3}, ${P.p5})`, boxShadow: softGlow(P.p5, .35) }}>
            <div style={styles.logoInner} />
          </div>
          <div>
            <h1 style={styles.title}>Create Account</h1>
            <p style={styles.subtitle}>Get started with your health journey</p>
          </div>
        </div>

        <form onSubmit={handleSignup} style={styles.form}>
          <Label>Full Name</Label>
          <input style={styles.input} placeholder="Jane Doe" value={name} onChange={e=>setName(e.target.value)} required />

          <Label>Email</Label>
          <input style={styles.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />

          <Label>Password</Label>
          <input style={styles.input} type="password" placeholder="At least 6 characters" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required />

          {err && <div style={styles.error}>{err}</div>}

          <button type="submit" disabled={busy} style={{ ...glowPill(P.p2, P.p5), width: '100%', justifyContent: 'center', display: 'inline-flex' }}>
            {busy ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div style={styles.divider}><div style={styles.line}/><span style={styles.divText}>or</span><div style={styles.line}/></div>

        <button onClick={handleGoogle} disabled={busy} style={{ ...styles.ghostBtn, ...glassBorder(0.12) }} data-raise>
          <div style={styles.gIcon}><div style={styles.gInner}/></div>
          Continue with Google
          <div style={styles.buttonRipple}></div>
        </button>

        <div style={styles.footer}>
          <span>Already have an account? </span>
          <a href="/auth/login" style={styles.link}>Sign in</a>
        </div>
      </div>
    </main>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={styles.label}>{children}</label>;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, position: 'relative', color: '#3c1d2a' },
  bg: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: `
      radial-gradient(1100px 700px at 15% -10%, ${alpha('#fff', .28)} 0%, transparent 60%),
      radial-gradient(900px 700px at 110% 10%, ${alpha(P.p2, .45)} 0%, transparent 65%),
      radial-gradient(900px 700px at -10% 80%, ${alpha(P.p4, .40)} 0%, transparent 60%),
      linear-gradient(135deg, ${P.p8}, ${P.p9} 35%, ${P.p7})
    `,
  },
  card: {
    position: 'relative', zIndex: 1, width: 'min(640px, 94vw)',
    borderRadius: 22, padding: 28,
    background: `linear-gradient(145deg, ${alpha('#ffffff', .75)}, ${alpha('#ffffff', .6)})`,
    boxShadow: softGlow(P.p5, .25),
  },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 },
  logo: { width: 54, height: 54, borderRadius: 12, display: 'grid', placeItems: 'center' },
  logoInner: { width: 22, height: 22, background: alpha('#fff', .55), borderRadius: 6 },
  title: { margin: 0, fontSize: '1.6rem', fontWeight: 900 },
  subtitle: { margin: 0, opacity: .8 },
  form: { display: 'grid', gap: 10, marginTop: 10 },
  label: { fontSize: 12, fontWeight: 700, opacity: .75 },
  input: {
    padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
    background: alpha('#ffffff', .7), outline: 'none', fontSize: '1rem',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' },
  line: { flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' },
  divText: { fontSize: 12, opacity: .7 },
  ghostBtn: {
    position: 'relative', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: '12px 18px', borderRadius: 14, fontWeight: 800, color: '#3c1d2a',
    background: alpha('#ffffff', .6), border: '1px solid rgba(0,0,0,0.06)',
  },
  gIcon: { width: 18, height: 18, borderRadius: 4, background: alpha('#000', .06), display: 'grid', placeItems: 'center' },
  gInner: { width: 12, height: 12, borderRadius: 2, background: 'linear-gradient(135deg,#ea4335 0%,#34a853 33%,#fbbc05 66%,#4285f4 100%)' },
  footer: { textAlign: 'center', marginTop: 10, fontSize: 14, opacity: .85 },
  link: { color: P.p5, fontWeight: 800, textDecoration: 'none' },
  error: { color: '#a00', background: alpha('#a00', .08), border: '1px solid rgba(0,0,0,0.06)', padding: '10px 12px', borderRadius: 10, fontSize: 14 },
  buttonRipple: { position: 'absolute', inset: 0, borderRadius: 14, background: `radial-gradient(120px 60px at var(--x,50%) var(--y,50%), ${alpha('#fff', .35)}, transparent 70%)`, opacity: 0, transition: 'opacity 200ms ease' },
};
