'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <main style={styles.wrap}>
      <div style={styles.overlay} />

      <div style={styles.content}>
        <h1 style={styles.title}>MediVault</h1>
        <p style={styles.tagline}>
          Secure. Private. Accessible.<br />
          Your medical records, always with you.
        </p>

        <Link href="/auth" style={styles.button}>
          Get Started
        </Link>
      </div>

      <footer style={styles.footer}>
        &copy; {new Date().getFullYear()} MediVault. All rights reserved.
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f8fafc',
    background:
      'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    overflow: 'hidden',
    padding: '0 16px',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'radial-gradient(circle at 20% 30%, rgba(34,197,94,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(56,189,248,0.15) 0%, transparent 60%)',
    zIndex: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    maxWidth: 600,
  },
  title: {
    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
    fontWeight: 800,
    marginBottom: 12,
    background: 'linear-gradient(to right, #22c55e, #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  tagline: {
    fontSize: '1.25rem',
    lineHeight: 1.5,
    color: '#cbd5e1',
    marginBottom: 32,
  },
  button: {
    display: 'inline-block',
    padding: '12px 28px',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
    background: 'linear-gradient(90deg, #22c55e, #38bdf8)',
    borderRadius: 9999,
    textDecoration: 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    fontSize: '0.875rem',
    color: '#94a3b8',
    zIndex: 1,
  },
};
