'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const auth = await getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setReady(true);
      });
      return () => unsub();
    })();
  }, []);

  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;

  if (!user) {
    return (
      <main style={styles.wrapCenter}>
        <div style={styles.welcomeCard}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>
              <div style={styles.logoInner}></div>
            </div>
          </div>
          <h1 style={styles.welcomeTitle}>MediVault</h1>
          <p style={styles.welcomeSubtitle}>Secure your medical data with ease</p>
          <Link href="/auth" style={styles.primaryButton}>
            <span>Get Started</span>
            <div style={styles.buttonGlow}></div>
          </Link>
        </div>
      </main>
    );
  }

  async function handleLogout() {
    const auth = await getFirebaseAuth();
    await signOut(auth);
  }

  return (
    <main style={styles.wrap}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <div style={styles.headerIconInner}></div>
          </div>
          <div>
            <h1 style={styles.headerTitle}>MediVault</h1>
            <div style={styles.headerSubtitle}>
              Welcome back, <strong>{user.displayName ?? user.email}</strong>
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <Link href="/onboarding/medical" style={styles.secondaryButton}>
            <span>Edit Profile</span>
            <div style={styles.buttonRipple}></div>
          </Link>
          <button onClick={handleLogout} style={styles.secondaryButton}>
            <span>Sign Out</span>
            <div style={styles.buttonRipple}></div>
          </button>
        </div>
      </header>

      {/* DASHBOARD GRID fills remaining viewport height */}
      <section style={styles.grid}>
        <FeatureCard
          title="Health Progress"
          subtitle="Track your wellness journey"
          href="/map"
          iconType="progress"
        />
        <FeatureCard
          title="Prescriptions"
          subtitle="Manage your medications"
          href="/prescriptions"
          iconType="prescription"
        />
        <FeatureCard
          title="Chat Support"
          subtitle="Get instant help"
          href="/chats"
          iconType="chat"
        />
        <FeatureCard
          title="Medical History"
          subtitle="View past records"
          href="/history"
          iconType="history"
        />
        <FeatureCard
          title="Medicine Tracker"
          subtitle="Monitor inventory"
          href="/medicine"
          iconType="medicine"
        />
        <FeatureCard
          title="Upload your scans"
          subtitle="AI-powered analysis"
          href="/scans"
          iconType="insights"
        />
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  subtitle,
  href,
  iconType,
}: {
  title: string;
  subtitle: string;
  href: string;
  iconType: string;
}) {
  return (
    <Link href={href} style={styles.card}>
      <div style={styles.cardContent}>
        <div style={{ ...styles.cardIcon, ...getIconStyle(iconType) }}>
          <div style={styles.cardIconInner}></div>
        </div>
        <div style={styles.cardText}>
          <h3 style={styles.cardTitle}>{title}</h3>
          <p style={styles.cardSubtitle}>{subtitle}</p>
        </div>
        <div style={styles.cardArrow}>
          <div style={styles.arrowIcon}></div>
        </div>
      </div>
      <div style={{ ...styles.cardGlow, ...getIconGlowStyle(iconType) }}></div>
      <div style={styles.cardBorder}></div>
    </Link>
  );
}

function getIconStyle(type: string): React.CSSProperties {
  const baseStyle = {
    width: 84, // bigger icon
    height: 84,
    borderRadius: 20,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  switch (type) {
    case 'progress':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 10px 28px rgba(102, 126, 234, 0.45)',
      };
    case 'prescription':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        boxShadow: '0 10px 28px rgba(240, 147, 251, 0.45)',
      };
    case 'chat':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        boxShadow: '0 10px 28px rgba(79, 172, 254, 0.45)',
      };
    case 'history':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        boxShadow: '0 10px 28px rgba(67, 233, 123, 0.45)',
      };
    case 'medicine':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        boxShadow: '0 10px 28px rgba(250, 112, 154, 0.45)',
      };
    case 'insights':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        boxShadow: '0 10px 28px rgba(168, 237, 234, 0.45)',
      };
    default:
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        boxShadow: '0 10px 28px rgba(107, 114, 128, 0.45)',
      };
  }
}

function getIconGlowStyle(type: string): React.CSSProperties {
  switch (type) {
    case 'progress':
      return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
    case 'prescription':
      return { background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' };
    case 'chat':
      return { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' };
    case 'history':
      return { background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' };
    case 'medicine':
      return { background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' };
    case 'insights':
      return { background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' };
    default:
      return { background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' };
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
    color: '#ffffff',
    padding: '16px 16px 16px', // tighter outer padding so grid can be full height
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflow: 'hidden',
  },
  wrapCenter: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  welcomeCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    padding: '48px 32px',
    textAlign: 'center' as const,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxWidth: 420,
    width: '100%',
    position: 'relative' as const,
  },
  logoContainer: {
    marginBottom: 24,
    display: 'flex',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 80,
    height: 80,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 20,
    position: 'relative' as const,
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.5), 0 0 40px rgba(102, 126, 234, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 40,
    height: 40,
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
  },
  welcomeTitle: {
    fontSize: '2.5rem',
    fontWeight: 800,
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  welcomeSubtitle: {
    color: '#94a3b8',
    fontSize: '1.1rem',
    marginBottom: 32,
    lineHeight: 1.6,
  },
  primaryButton: {
    position: 'relative' as const,
    display: 'inline-block',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: 16,
    fontWeight: 600,
    fontSize: '1rem',
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
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
  header: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: 18,
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    flexShrink: 0, // don't let header eat grid height
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconInner: {
    width: 18,
    height: 18,
    background: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginTop: 2,
  },
  headerActions: {
    display: 'flex',
    gap: 10,
  },
  secondaryButton: {
    position: 'relative' as const,
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    overflow: 'hidden' as const,
    backdropFilter: 'blur(10px)',
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
    borderRadius: 10,
  },

  // ==== FULL-SCREEN GRID (3 cols × 2 rows) ====
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: 14,
    flex: 1, // take remaining height under header
    minHeight: 0,
  },

  // Tile is full cell height
  card: {
    position: 'relative' as const,
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(16px)',
    borderRadius: 18,
    padding: 28,
    textDecoration: 'none',
    color: 'inherit',
    overflow: 'hidden' as const,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.28)',
    height: '100%',            // <-- fill the row
    display: 'flex',           // center content
    alignItems: 'center',
  },
  cardContent: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    gap: 24,
    position: 'relative' as const,
    zIndex: 3,
    width: '100%',
    transform: 'scale(1.05)',  // slightly larger inner content
  },
  cardIcon: {
    flexShrink: 0,
  },
  cardIconInner: {
    width: 34,
    height: 34,
    background: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    margin: '0 0 10px 0',
    fontSize: '1.6rem', // bigger title
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    margin: 0,
    color: '#b6c2d1',
    fontSize: '1.05rem',
    lineHeight: 1.6,
  },
  cardArrow: {
    width: 50,
    height: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    transition: 'all 0.3s ease',
  },
  arrowIcon: {
    width: 18,
    height: 18,
    background: 'rgba(255, 255, 255, 0.7)',
    clipPath: 'polygon(0 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0 80%)',
    transition: 'transform 0.3s ease',
  },
  cardGlow: {
    position: 'absolute' as const,
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    opacity: 0,
    transition: 'opacity 0.3s ease',
    borderRadius: 20,
    filter: 'blur(20px)',
    zIndex: 1,
  },
  cardBorder: {
    position: 'absolute' as const,
    inset: 0,
    borderRadius: 18,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.14), transparent)',
    opacity: 0.55,
    zIndex: 2,
    pointerEvents: 'none',
  },
};
