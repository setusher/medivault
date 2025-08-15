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
      <div style={styles.container}>
        <div style={styles.leftPanel}>
          <div style={styles.illustration}>
            <div style={styles.docIcon}></div>
            <div style={styles.clipboardIcon}></div>
            <div style={styles.pillIcon}></div>
          </div>
          <h2 style={styles.leftTitle}>Join MediVault</h2>
          <p style={styles.leftSubtitle}>
            Create your secure medical profile and take control of your health data.
          </p>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.formCard}>
            <div style={styles.header}>
              <h1 style={styles.title}>Create Account</h1>
              <p style={styles.subtitle}>Get started with your health journey</p>
            </div>

            <form onSubmit={handleSignup} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

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
                  placeholder="Create a secure password (min 6 chars)"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {err && <div style={styles.error}>{err}</div>}

              <button type="submit" style={styles.primaryBtn} disabled={busy}>
                {busy ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div style={styles.divider}>
              <span style={styles.dividerText}>or continue with</span>
            </div>

            <button onClick={handleGoogle} style={styles.googleBtn} disabled={busy}>
              <div style={styles.googleIcon}></div>
              Continue with Google
            </button>

            <div style={styles.footer}>
              <span>Already have an account? </span>
              <a href="/auth/login" style={styles.link}>Sign in here</a>
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
    minHeight: 700,
    background: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  leftPanel: {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
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
  docIcon: {
    position: 'absolute' as const,
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 60,
    height: 60,
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  clipboardIcon: {
    position: 'absolute' as const,
    bottom: 20,
    left: 20,
    width: 50,
    height: 50,
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
  },
  pillIcon: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
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
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: 'white',
    fontWeight: 600,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    boxShadow: '0 8px 24px rgba(79, 172, 254, 0.25)',
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
    marginBottom: 24,
  },
  googleIcon: {
    width: 20,
    height: 20,
    background: 'linear-gradient(135deg, #ea4335 0%, #34a853 25%, #fbbc05 50%, #4285f4 100%)',
    borderRadius: 4,
  },
  footer: {
    textAlign: 'center' as const,
    color: '#64748b',
    fontSize: '0.9rem',
  },
  link: {
    color: '#4facfe',
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
  }}