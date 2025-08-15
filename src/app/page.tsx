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
            <div style={styles.logoIcon}></div>
          </div>
          <h1 style={styles.welcomeTitle}>MediVault</h1>
          <p style={styles.welcomeSubtitle}>Secure your medical data with ease</p>
          <Link href="/auth" style={styles.primaryButton}>Get Started</Link>
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
          <div style={styles.headerIcon}></div>
          <div>
            <h1 style={styles.headerTitle}>MediVault</h1>
            <div style={styles.headerSubtitle}>
              Welcome back, <strong>{user.displayName ?? user.email}</strong>
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <Link href="/onboarding/medical" style={styles.secondaryButton}>Edit Profile</Link>
          <button onClick={handleLogout} style={styles.secondaryButton}>Sign Out</button>
        </div>
      </header>

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
          title="Health Insights"
          subtitle="AI-powered analysis"
          href="/invisiondx"
          iconType="insights"
        />
      </section>
    </main>
  );
}

function FeatureCard({ title, subtitle, href, iconType }: { 
  title: string; 
  subtitle: string; 
  href: string; 
  iconType: string;
}) {
  return (
    <Link href={href} style={styles.card}>
      <div style={styles.cardContent}>
        <div style={{...styles.cardIcon, ...getIconStyle(iconType)}}></div>
        <div style={styles.cardText}>
          <h3 style={styles.cardTitle}>{title}</h3>
          <p style={styles.cardSubtitle}>{subtitle}</p>
        </div>
        <div style={styles.cardArrow}>→</div>
      </div>
      <div style={styles.cardGlow}></div>
    </Link>
  );
}

function getIconStyle(type: string): React.CSSProperties {
  const baseStyle = {
    width: 48,
    height: 48,
    borderRadius: 12,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  switch (type) {
    case 'progress':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)',
      };
    case 'prescription':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
      };
    case 'chat':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
      };
    case 'history':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
      };
    case 'medicine':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)',
      };
    case 'insights':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)',
      };
    default:
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)',
      };
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fafafa 0%, #f0f4f8 100%)',
    padding: '24px',
    color: '#1a202c',
  },
  wrapCenter: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fafafa 0%, #f0f4f8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  welcomeCard: {
    background: 'white',
    borderRadius: 24,
    padding: '48px 32px',
    textAlign: 'center' as const,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    maxWidth: 420,
    width: '100%',
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
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
  },
  welcomeTitle: {
    fontSize: '2.5rem',
    fontWeight: 800,
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  welcomeSubtitle: {
    color: '#64748b',
    fontSize: '1.1rem',
    marginBottom: 32,
    lineHeight: 1.6,
  },
  primaryButton: {
    display: 'inline-block',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: 16,
    fontWeight: 600,
    fontSize: '1rem',
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
    transition: 'all 0.3s ease',
  },
  header: {
    background: 'white',
    borderRadius: 20,
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a202c',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: '0.9rem',
    marginTop: 2,
  },
  headerActions: {
    display: 'flex',
    gap: 12,
  },
  secondaryButton: {
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 20,
  },
  card: {
    background: 'white',
    borderRadius: 20,
    padding: 24,
    textDecoration: 'none',
    color: 'inherit',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    border: '1px solid rgba(0, 0, 0, 0.06)',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  cardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'relative' as const,
    zIndex: 2,
  },
  cardIcon: {
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#1a202c',
  },
  cardSubtitle: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.9rem',
    lineHeight: 1.4,
  },
  cardArrow: {
    fontSize: '1.2rem',
    color: '#94a3b8',
    fontWeight: 600,
  },
  cardGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
};