'use client';

import Link from 'next/link';

export default function AuthLanding() {
  return (
    <main style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to MediVault</h1>
        <p style={styles.subtitle}>Secure your medical data with ease.</p>

        <div style={styles.buttons}>
          <Link href="/auth/signup" style={styles.primaryBtn}>
            Create Account
          </Link>
          <Link href="/auth/login" style={styles.secondaryBtn}>
            Login
          </Link>
        </div>
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
    padding: '32px 24px',
    maxWidth: 400,
    width: '100%',
    textAlign: 'center',
    color: '#e2e8f0',
    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: 8,
    background: 'linear-gradient(to right, #22c55e, #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#94a3b8',
    marginBottom: 24,
  },
  buttons: {
    display: 'grid',
    gap: 12,
  },
  primaryBtn: {
    display: 'block',
    padding: '12px 16px',
    background: 'linear-gradient(90deg, #22c55e, #38bdf8)',
    color: '#0f172a',
    fontWeight: 600,
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: '1rem',
  },
  secondaryBtn: {
    display: 'block',
    padding: '12px 16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#e2e8f0',
    fontWeight: 600,
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: '1rem',
  },
};
