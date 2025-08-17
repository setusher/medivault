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
            <div style={styles.shieldIcon}>
              <div style={styles.shieldInner}></div>
            </div>
            <div style={styles.lockIcon}>
              <div style={styles.lockInner}></div>
            </div>
            <div style={styles.keyIcon}>
              <div style={styles.keyInner}></div>
            </div>
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

            <div style={styles.form}>
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

              <button onClick={handleLogin} style={styles.primaryBtn} disabled={busy}>
                <span>{busy ? 'Signing In...' : 'Sign In'}</span>
                <div style={styles.buttonGlow}></div>
              </button>
            </div>

            <div style={styles.divider}>
              <div style={styles.dividerLine}></div>
              <span style={styles.dividerText}>or continue with</span>
              <div style={styles.dividerLine}></div>
            </div>

            <button onClick={handleGoogle} style={styles.googleBtn} disabled={busy}>
              <div style={styles.googleIcon}>
                <div style={styles.googleIconInner}></div>
              </div>
              <span>Continue with Google</span>
              <div style={styles.buttonRipple}></div>
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
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
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
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
  },
  shieldInner: {
    width: 40,
    height: 40,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 8,
  },
  lockIcon: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
  },
  lockInner: {
    width: 20,
    height: 20,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 4,
  },
  keyIcon: {
    position: 'absolute' as const,
    bottom: 10,
    left: 10,
    width: 36,
    height: 36,
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  keyInner: {
    width: 18,
    height: 18,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 9,
  },
  leftTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 16,
    textAlign: 'center' as const,
    textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
  },
  leftSubtitle: {
    fontSize: '1.1rem',
    textAlign: 'center' as const,
    lineHeight: 1.6,
    opacity: 0.9,
    textShadow: '0 1px 10px rgba(0, 0, 0, 0.2)',
  },
  rightPanel: {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(10px)',
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
    color: '#ffffff',
    textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
  },
  subtitle: {
    color: '#94a3b8',
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
    color: '#e2e8f0',
  },
  input: {
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    color: '#ffffff',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  primaryBtn: {
    position: 'relative' as const,
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontWeight: 600,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
    overflow: 'hidden' as const,
  },
  buttonGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
    borderRadius: 12,
  },
  divider: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center' as const,
    margin: '24px 0',
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap' as const,
  },
  googleBtn: {
    position: 'relative' as const,
    width: '100%',
    padding: '14px 24px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: '#e2e8f0',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
    overflow: 'hidden' as const,
  },
  googleIcon: {
    width: 20,
    height: 20,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconInner: {
    width: 12,
    height: 12,
    background: 'linear-gradient(135deg, #ea4335 0%, #34a853 25%, #fbbc05 50%, #4285f4 100%)',
    borderRadius: 2,
  },
  buttonRipple: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
    borderRadius: 12,
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
    transition: 'color 0.3s ease',
  },
  footer: {
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.3s ease',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '0.9rem',
    background: 'rgba(255, 107, 107, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255, 107, 107, 0.2)',
  },
  info: {
    color: '#4facfe',
    fontSize: '0.9rem',
    background: 'rgba(79, 172, 254, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid rgba(79, 172, 254, 0.2)',
  },
};