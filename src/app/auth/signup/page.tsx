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
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      try {
        await sendEmailVerification(cred.user);
      } catch {}
      router.replace('/');
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
      router.replace('/');
    } catch (e: any) {
      setErr(e?.message ?? 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Account</h1>
        <form onSubmit={handleSignup} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {err && <div style={styles.error}>{err}</div>}
          <button type="submit" style={styles.primaryBtn} disabled={busy}>
            {busy ? 'Creating…' : 'Create Account'}
          </button>
        </form>

        <button onClick={handleGoogle} style={styles.googleBtn} disabled={busy}>
          Continue with Google
        </button>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    padding: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    color: '#e2e8f0',
    display: 'grid',
    gap: 12,
  },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 },
  form: { display: 'grid', gap: 12 },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
  },
  primaryBtn: {
    padding: '10px 12px',
    background: '#22c55e',
    color: '#0f172a',
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
  },
  googleBtn: {
    padding: '10px 12px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 8,
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  error: {
    color: '#fecaca',
    fontSize: '0.9rem',
    background: 'rgba(239, 68, 68, 0.15)',
    padding: '6px 8px',
    borderRadius: 6,
  },
};
