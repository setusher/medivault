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
      <div style={styles.container}>
        <div style={styles.leftPanel}>
          <div style={styles.illustration}>
            <div style={styles.shieldIcon}></div>
            <div style={styles.lockIcon}></div>
            <div style={styles.keyIcon}></div>
          </div>
          <h2 style={styles.leftTitle}>Welcome Back</h2>
          <p style={styles.leftSubtitle}>
            Securely access your medical information and continue managing your health journey.
          </p>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.formCard}>
            <div style={styles.header}>
              <h1 style={styles.title}>Sign In</h1>
              <p style={styles.subtitle}>Access your MediVault account</p>
            </div>

            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {err && <div style={styles.error}>{err}</div>}
              {info && <div style={styles.info}>{info}</div>}

              <button type="submit" style={styles.primaryBtn} disabled={busy}>
                {busy ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div style={styles.divider}>
              <span style={styles.dividerText}>or continue with</span>
            </div>

            <button onClick={handleGoogle} style={styles.googleBtn} disabled={busy}>
              <div style={styles.googleIcon}></div>
              Continue with Google
            </button>

            <div style={styles.forgotPassword}>
              <button onClick={handleForgotPassword} style={styles.linkBtn}>
                Forgot your password?
              </button>
            </div>

            <div style={styles.footer}>
              <span>Don't have an account? </span>
              <a href="/auth/signup" style={styles.link}>Create one here</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fafafa 0%, #f0f4f8 100%)',
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    maxWidth: 1200,
    width: '100%',
    minHeight: 600,
    background: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  leftPanel: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: 48,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    position: 'relative' as const,
  },
  illustration: {
    position: 'relative' as const,
    width: 160,
    height: 160,
    marginBottom: 32,
  },
  shieldIcon: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 80,
    height: 80,
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  lockIcon: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
  },
  keyIcon: {
    position: 'absolute' as const,
    bottom: 10,
    left: 10,
    width: 36,
    height: 36,
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 18,
  },
  leftTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  leftSubtitle: {
    fontSize: '1.1rem',
    textAlign: 'center' as const,
    lineHeight: 1.6,
    opacity: 0.9,
  },
  rightPanel: {
    padding: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 700,
    marginBottom: 8,
    color: '#1a202c',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
    marginBottom: 24,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#fafafa',
    color: '#1a202c',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  primaryBtn: {
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontWeight: 600,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)',
    transition: 'all 0.3s ease',
  },
  divider: {
    position: 'relative' as const,
    textAlign: 'center' as const,
    margin: '24px 0',
  },
  dividerText: {
    background: 'white',
    padding: '0 16px',
    color: '#94a3b8',
    fontSize: '0.9rem',
    position: 'relative' as const,
    zIndex: 1,
  },
  googleBtn: {
    width: '100%',
    padding: '14px 24px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    color: '#374151',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    marginBottom: 16,
  },
  googleIcon: {
    width: 20,
    height: 20,
    background: 'linear-gradient(135deg, #ea4335 0%, #34a853 25%, #fbbc05 50%, #4285f4 100%)',
    borderRadius: 4,
  },
  forgotPassword: {
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '0.9rem',
    textDecoration: 'underline',
  },
  footer: {
    textAlign: 'center' as const,
    color: '#64748b',
    fontSize: '0.9rem',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 500,
  },
  error: {
    color: '#ef4444',
    fontSize: '0.9rem',
    background: 'rgba(239, 68, 68, 0.1)',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  info: {
    color: '#0ea5e9',
    fontSize: '0.9rem',
    background: 'rgba(14, 165, 233, 0.1)',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid rgba(14, 165, 233, 0.2)',
  },
};