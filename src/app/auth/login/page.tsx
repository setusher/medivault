'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const auth = await getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      setErr(e?.message ?? 'Login failed');
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

  async function handleForgotPassword() {
    if (!email) {
      setErr('Enter your email first.');
      return;
    }
    setErr(null);
    setInfo(null);
    try {
      const auth = await getFirebaseAuth();
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('Password reset email sent.');
    } catch (e: any) {
      setErr(e?.message ?? 'Password reset failed');
    }
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login</h1>
        <form onSubmit={handleLogin} style={styles.form}>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {err && <div style={styles.error}>{err}</div>}
          {info && <div style={styles.info}>{info}</div>}
          <button type="submit" style={styles.primaryBtn} disabled={busy}>
            {busy ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <button onClick={handleGoogle} style={styles.googleBtn} disabled={busy}>
          Continue with Google
        </button>

        <button onClick={handleForgotPassword} style={styles.linkBtn}>
          Forgot password?
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
    background: '#38bdf8',
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
  linkBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#93c5fd',
    cursor: 'pointer',
    textAlign: 'left',
  },
  error: {
    color: '#fecaca',
    fontSize: '0.9rem',
    background: 'rgba(239, 68, 68, 0.15)',
    padding: '6px 8px',
    borderRadius: 6,
  },
  info: {
    color: '#bfdbfe',
    fontSize: '0.9rem',
    background: 'rgba(59, 130, 246, 0.15)',
    padding: '6px 8px',
    borderRadius: 6,
  },
};
