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
            <div style={styles.docIcon}>
              <div style={styles.docInner}></div>
            </div>
            <div style={styles.clipboardIcon}>
              <div style={styles.clipboardInner}></div>
            </div>
            <div style={styles.pillIcon}>
              <div style={styles.pillInner}></div>
            </div>
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

            <div onSubmit={handleSignup} style={styles.form}>
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

              <button type="submit" style={styles.primaryBtn} disabled={busy} onClick={handleSignup}>
                <span>{busy ? 'Creating Account...' : 'Create Account'}</span>
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
    minHeight: 700,
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
  },
  docInner: {
    width: 30,
    height: 30,
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    borderRadius: 6,
  },
  clipboardIcon: {
    position: 'absolute' as const,
    bottom: 20,
    left: 20,
    width: 50,
    height: 50,
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
  },
  clipboardInner: {
    width: 25,
    height: 25,
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    borderRadius: 5,
  },
  pillIcon: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
  },
  pillInner: {
    width: 20,
    height: 20,
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    borderRadius: 10,
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
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: 'white',
    fontWeight: 600,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    boxShadow: '0 8px 24px rgba(79, 172, 254, 0.4)',
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
    marginBottom: 24,
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
  footer: {
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  link: {
    color: '#4facfe',
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
};