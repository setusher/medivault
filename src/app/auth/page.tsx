'use client';

import Link from 'next/link';

export default function AuthLanding() {
  return (
    <main style={styles.wrap}>
      <div style={styles.container}>
        <div style={styles.leftPanel}>
          <div style={styles.illustration}>
            <div style={styles.illustrationBg}>
              <div style={styles.heartIcon}>
                <div style={styles.heartInner}></div>
              </div>
              <div style={styles.pulseRing}></div>
              <div style={styles.stethoscope}>
                <div style={styles.stethoscopeInner}></div>
              </div>
            </div>
          </div>
          <div style={styles.leftContent}>
            <h2 style={styles.leftTitle}>Secure Health Management</h2>
            <p style={styles.leftSubtitle}>
              Keep your medical information safe, organized, and accessible whenever you need it.
            </p>
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.authCard}>
            <div style={styles.logoContainer}>
              <div style={styles.logo}>
                <div style={styles.logoInner}></div>
              </div>
            </div>
            <h1 style={styles.title}>Welcome to MediVault</h1>
            <p style={styles.subtitle}>
              Your trusted digital health companion for secure medical data management.
            </p>

            <div style={styles.buttons}>
              <Link href="/auth/signup" style={styles.primaryBtn}>
                <span>Create New Account</span>
                <div style={styles.buttonGlow}></div>
              </Link>
              <Link href="/auth/login" style={styles.secondaryBtn}>
                <span>Sign In to Account</span>
                <div style={styles.buttonRipple}></div>
              </Link>
            </div>

            <div style={styles.features}>
              <div style={styles.feature}>
                <div style={{...styles.featureIcon, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}></div>
                <span>Bank-level Security</span>
              </div>
              <div style={styles.feature}>
                <div style={{...styles.featureIcon, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'}}></div>
                <span>HIPAA Compliant</span>
              </div>
              <div style={styles.feature}>
                <div style={{...styles.featureIcon, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}></div>
                <span>Always Accessible</span>
              </div>
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
    overflow: 'hidden' as const,
  },
  illustration: {
    marginBottom: 32,
    position: 'relative' as const,
  },
  illustrationBg: {
    width: 200,
    height: 200,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
  },
  heartIcon: {
    width: 80,
    height: 80,
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
  },
  heartInner: {
    width: 40,
    height: 40,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 8,
  },
  pulseRing: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 120,
    height: 120,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  stethoscope: {
    position: 'absolute' as const,
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  stethoscopeInner: {
    width: 20,
    height: 20,
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 4,
  },
  leftContent: {
    textAlign: 'center' as const,
  },
  leftTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    margin: '0 0 16px 0',
    color: 'white',
    textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
  },
  leftSubtitle: {
    fontSize: '1.1rem',
    lineHeight: 1.6,
    opacity: 0.9,
    margin: 0,
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
  authCard: {
    width: '100%',
    maxWidth: 400,
    textAlign: 'center' as const,
  },
  logoContainer: {
    marginBottom: 32,
    display: 'flex',
    justifyContent: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 32,
    height: 32,
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 12,
    color: '#ffffff',
    textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#94a3b8',
    marginBottom: 32,
    lineHeight: 1.6,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    marginBottom: 32,
  },
  primaryBtn: {
    position: 'relative' as const,
    display: 'block',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontWeight: 600,
    borderRadius: 16,
    textDecoration: 'none',
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
    borderRadius: 16,
  },
  secondaryBtn: {
    position: 'relative' as const,
    display: 'block',
    padding: '16px 24px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
    fontWeight: 600,
    borderRadius: 16,
    textDecoration: 'none',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden' as const,
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
    borderRadius: 16,
  },
  features: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
  },
  feature: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    flex: 1,
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
};