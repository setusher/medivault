'use client';

import Image from 'next/image';
import progressIcon from '@/assets/progress.png';
import prescriptionIcon from '@/assets/prescription.png';
import doctorIcon from '@/assets/doctor.png';
import historyIcon from '@/assets/history.png';
import medicineIcon from '@/assets/medicine.png';
import scanIcon from '@/assets/scan.png';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

// New playful palette
const P = {
  p1: '#fadde1',
  p2: '#ffc4d6',
  p3: '#ffa6c1',
  p4: '#ff87ab',
  p5: '#ff5d8f',
  p6: '#ff97b7',
  p7: '#ffacc5',
  p8: '#ffcad4',
  p9: '#f4acb7',
};

const ICONS = {
  progress: progressIcon,
  prescriptions: prescriptionIcon,
  chat: doctorIcon,
  history: historyIcon,
  medicine: medicineIcon,
  scans: scanIcon,
};


export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => setMounted(true), []);

  if (!ready) return <div style={{ padding: 24, color: P.p5 }}>Loading…</div>;

  if (!user) {
    return (
      <main style={styles.wrapCenter}>
        <Background />
        <div style={{ ...styles.welcomeCard, ...glassBorder(0.18) }} data-raise>
          <div style={styles.logoContainer}>
            <div
              style={{
                ...styles.logoIcon,
                background: `linear-gradient(135deg, ${P.p3}, ${P.p5})`,
                boxShadow: softGlow(P.p5, 0.45),
              }}
            >
              <div style={{ ...styles.logoInner, background: 'rgba(255,255,255,0.35)' }} />
            </div>
          </div>
          <h1
            style={{
              ...styles.welcomeTitle,
              backgroundImage: `linear-gradient(135deg, ${P.p4}, ${P.p5})`,
            }}
          >
            MediVault
          </h1>
          <p style={styles.welcomeSubtitle}>Secure your medical data with a light, friendly touch</p>
          <Link href="/auth" style={{ ...styles.primaryButton, ...glowButton(P.p3, P.p5) }} data-raise>
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
    <main
      style={{
        ...styles.wrap,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(8px)',
        transition: 'opacity 380ms ease, transform 380ms ease',
      }}
    >
      <Background />

      <header style={{ ...styles.header, ...glassBorder(0.16) }} data-raise>
        <div style={styles.headerLeft}>
          <div
            style={{
              ...styles.headerIcon,
              background: `linear-gradient(135deg, ${P.p3}, ${P.p5})`,
              boxShadow: softGlow(P.p5, 0.35),
            }}
          >
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
          <Link href="/onboarding/medical" style={{ ...styles.secondaryButton, ...glassBorder(0.12) }} data-raise>
            <span>Edit Profile</span>
            <div style={styles.buttonRipple}></div>
          </Link>
          <button onClick={handleLogout} style={{ ...styles.secondaryButton, ...glassBorder(0.12) }} data-raise>
            <span>Sign Out</span>
            <div style={styles.buttonRipple}></div>
          </button>
        </div>
      </header>

      {/* FULL-SCREEN 3x2 GRID */}
      <section style={styles.grid}>
  <FeatureCard
    title="Health Progress"
    subtitle="Track your wellness journey"
    href="/map"
    colorA={P.p2}
    colorB={P.p4}
    iconSrc={ICONS.progress}
  />
  <FeatureCard
    title="Prescriptions"
    subtitle="Manage your medications"
    href="/prescriptions"
    colorA={P.p1}
    colorB={P.p5}
    iconSrc={ICONS.prescriptions}
  />
  <FeatureCard
    title="Chat Support"
    subtitle="Get instant help"
    href="/chats"
    colorA={P.p3}
    colorB={P.p6}
    iconSrc={ICONS.chat}
  />
  <FeatureCard
    title="Medical History"
    subtitle="View past records"
    href="/history"
    colorA={P.p7}
    colorB={P.p9}
    iconSrc={ICONS.history}
  />
  <FeatureCard
    title="Medicine Tracker"
    subtitle="Monitor inventory"
    href="/medicine"
    colorA={P.p8}
    colorB={P.p6}
    iconSrc={ICONS.medicine}
  />
  <FeatureCard
    title="Upload your scans"
    subtitle="AI-powered analysis"
    href="/scans"
    colorA={P.p2}
    colorB={P.p5}
    iconSrc={ICONS.scans}
  />
</section>

    </main>
  );
}

/** Light, playful layered background using the new palette */
function Background() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: `
          radial-gradient(1200px 800px at 20% -10%, ${alpha('#ffffff', 0.25)} 0%, transparent 60%),
          radial-gradient(900px 700px at 110% 10%, ${alpha(P.p2, 0.45)} 0%, transparent 65%),
          radial-gradient(900px 700px at -10% 80%, ${alpha(P.p4, 0.40)} 0%, transparent 60%),
          linear-gradient(135deg, ${P.p8}, ${P.p9} 35%, ${P.p7})
        `,
        filter: 'saturate(1.05)',
      }}
    />
  );
}

function FeatureCard({
  title, subtitle, href, colorA, colorB, iconSrc,
}: {
  title: string;
  subtitle: string;
  href: string;
  colorA: string;
  colorB: string;
  iconSrc: any; // StaticImageData
}) {
  return (
    <Link href={href} style={{ ...styles.card, ...glassBorder(0.16) }} data-raise>
      <div style={styles.cardContent}>
        <div style={{ ...styles.cardIcon, }}>
          <Image
            src={iconSrc}
            alt=""
            width={100}
            height={100}
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>

        <div style={styles.cardText}>
          <h3 style={styles.cardTitle}>{title}</h3>
          <p style={styles.cardSubtitle}>{subtitle}</p>

          <div style={{ marginTop: 16, display: 'inline-block', ...glowPill(colorA, colorB) }} data-raise>
            Open
          </div>
        </div>
        <div style={styles.cardArrow}>
          <div style={styles.arrowIcon}></div>
        </div>
      </div>

      <div
        style={{
          ...styles.cardGlow,
          background: `radial-gradient(80% 80% at 20% 10%, ${alpha(colorA, 0.45)}, transparent 70%),
                       radial-gradient(100% 100% at 80% 100%, ${alpha(colorB, 0.45)}, transparent 65%)`,
        }}
      />
      <div style={styles.cardBorder}></div>
    </Link>
  );
}


/* ---------- helpers ---------- */
function alpha(hex: string, a = 0.5) {
  const c = Number.parseInt(hex.replace('#', ''), 16);
  const r = (c >> 16) & 255,
    g = (c >> 8) & 255,
    b = c & 255;
  return `rgba(${r},${g},${b},${a})`;
}
function softGlow(color: string, strength = 0.5) {
  return `0 10px 28px ${alpha(color, strength)}, 0 0 64px ${alpha(color, strength * 0.6)}`;
}
function glassBorder(opacity = 0.14): React.CSSProperties {
  return {
    border: `1px solid ${alpha('#ffffff', opacity)}`,
    backdropFilter: 'blur(18px)',
  };
}
function glowButton(a: string, b: string): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${a}, ${b})`,
    color: '#3c1d2a',
    boxShadow: softGlow(b, 0.6),
    transition: 'transform 240ms cubic-bezier(.2,.8,.2,1), box-shadow 240ms ease, filter 240ms ease',
  };
}
function glowPill(a: string, b: string): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.4,
    color: '#3c1d2a',
    background: `linear-gradient(135deg, ${a}, ${b})`,
    boxShadow: softGlow(b, 0.45),
    transition: 'transform 200ms ease, box-shadow 200ms ease',
  };
}

/* ---------- styles ---------- */
const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    color: '#3c1d2a',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  wrapCenter: {
    minHeight: '100vh',
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    color: '#3c1d2a',
  },
  welcomeCard: {
    borderRadius: 24,
    padding: '48px 36px',
    textAlign: 'center' as const,
    boxShadow: softGlow(P.p5, 0.35),
    maxWidth: 520,
    width: '100%',
    position: 'relative' as const,
    background: `linear-gradient(145deg, ${alpha('#ffffff', 0.7)}, ${alpha('#ffffff', 0.5)})`,
  },
  logoContainer: {
    marginBottom: 24,
    display: 'flex',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 84,
    height: 84,
    borderRadius: 20,
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  welcomeTitle: {
    fontSize: '2.6rem',
    fontWeight: 900,
    margin: '0 0 8px 0',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  welcomeSubtitle: {
    color: alpha('#3c1d2a', 0.7),
    fontSize: '1.06rem',
    marginBottom: 28,
    lineHeight: 1.6,
  },
  primaryButton: {
    position: 'relative' as const,
    display: 'inline-block',
    padding: '14px 28px',
    textDecoration: 'none',
    borderRadius: 16,
    fontWeight: 800,
    fontSize: '1rem',
    overflow: 'hidden' as const,
    transform: 'translateZ(0)',
  },
  buttonGlow: {
    position: 'absolute' as const,
    inset: 0,
    background: `radial-gradient(60% 60% at 50% 0%, ${alpha('#fff', 0.25)}, transparent)`,
    opacity: 0.0,
    transition: 'opacity 260ms ease',
    borderRadius: 16,
  },

  header: {
    borderRadius: 18,
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    background: `linear-gradient(135deg, ${alpha('#ffffff', 0.65)}, ${alpha('#ffffff', 0.5)})`,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconInner: {
    width: 18,
    height: 18,
    background: alpha('#ffffff', 0.6),
    borderRadius: 4,
  },
  headerTitle: { margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#3c1d2a' },
  headerSubtitle: { color: alpha('#3c1d2a', 0.7), fontSize: '0.92rem', marginTop: 2 },
  headerActions: { display: 'flex', gap: 10 },

  secondaryButton: {
    position: 'relative' as const,
    padding: '10px 14px',
    background: alpha('#ffffff', 0.7),
    borderRadius: 12,
    color: '#3c1d2a',
    textDecoration: 'none',
    fontSize: '0.92rem',
    fontWeight: 800,
    cursor: 'pointer',
    overflow: 'hidden' as const,
    transition: 'transform 200ms ease, filter 200ms ease, box-shadow 200ms ease',
  },
  buttonRipple: {
    position: 'absolute' as const,
    inset: 0,
    background: `radial-gradient(circle at var(--x,50%) var(--y,50%), ${alpha('#fff', 0.2)} 0%, transparent 60%)`,
    opacity: 0,
    transition: 'opacity 200ms ease',
    borderRadius: 12,
    pointerEvents: 'none',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: 14,
    flex: 1,
    minHeight: 0,
    zIndex: 1,
  },

  card: {
    position: 'relative' as const,
    borderRadius: 18,
    padding: 28,
    textDecoration: 'none',
    overflow: 'hidden' as const,
    transition: 'transform 200ms ease, box-shadow 200ms ease, background 200ms ease, filter 200ms ease',
    boxShadow: '0 6px 22px rgba(0,0,0,0.12)',
    height: '100%',
    display: 'flex',
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
    transform: 'scale(1.02)',
  },
  cardIcon: {
    width: 82,
    height: 82,
    borderRadius: 18,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardIconInner: {
    width: 32,
    height: 32,
    background: alpha('#ffffff', 0.7),
    borderRadius: 8,
  },
  cardText: { flex: 1, color: '#3c1d2a' },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#3c1d2a',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    margin: 0,
    color: alpha('#3c1d2a', 0.8),
    fontSize: '1.02rem',
    lineHeight: 1.6,
  },
  cardArrow: {
    width: 50,
    height: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: alpha('#ffffff', 0.55),
    borderRadius: 14,
    transition: 'all 0.2s ease',
  },
  arrowIcon: {
    width: 18,
    height: 18,
    background: alpha('#3c1d2a', 0.9),
    clipPath: 'polygon(0 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0 80%)',
    transition: 'transform 0.2s ease',
  },
  cardGlow: {
    position: 'absolute' as const,
    inset: -2,
    opacity: 0.0,
    transition: 'opacity 220ms ease',
    borderRadius: 20,
    filter: 'blur(18px)',
    zIndex: 1,
  },
  cardBorder: {
    position: 'absolute' as const,
    inset: 0,
    borderRadius: 18,
    background: `linear-gradient(135deg, ${alpha('#ffffff', 0.35)}, transparent)`,
    opacity: 0.7,
    zIndex: 2,
    pointerEvents: 'none',
  },
};

/* ---------- interaction: gentle lift on hover (for inline styles) ---------- */
if (typeof window !== 'undefined') {
  const liftIn = (el: HTMLElement) => {
    el.style.transform = 'translateY(-3px) scale(1.015)';
    el.style.boxShadow = el.style.boxShadow || '';
    el.style.filter = 'brightness(1.02)';
    const ripple = el.querySelector<HTMLElement>('div[style*="radial-gradient"]');
    const glow = Array.from(el.children).find(
      (c) => c instanceof HTMLElement && (c as HTMLElement).style.filter?.includes('blur')
    ) as HTMLElement | undefined;
    if (ripple) ripple.style.opacity = '1';
    if (glow) glow.style.opacity = '0.85';
  };
  const liftOut = (el: HTMLElement) => {
    el.style.transform = 'none';
    el.style.filter = 'none';
    const ripple = el.querySelector<HTMLElement>('div[style*="radial-gradient"]');
    const glow = Array.from(el.children).find(
      (c) => c instanceof HTMLElement && (c as HTMLElement).style.filter?.includes('blur')
    ) as HTMLElement | undefined;
    if (ripple) ripple.style.opacity = '0';
    if (glow) glow.style.opacity = '0';
  };

  const handleEnter = (e: Event) => liftIn(e.currentTarget as HTMLElement);
  const handleLeave = (e: Event) => liftOut(e.currentTarget as HTMLElement);
  const handleMove = (e: MouseEvent) => {
    const t = e.currentTarget as HTMLElement;
    const r = t.getBoundingClientRect();
    const ripple = t.querySelector<HTMLElement>('div[style*="radial-gradient"]');
    if (ripple) {
      ripple.style.setProperty('--x', `${e.clientX - r.left}px`);
      ripple.style.setProperty('--y', `${e.clientY - r.top}px`);
    }
  };

  const attach = () => {
    document.querySelectorAll<HTMLElement>('[data-raise]').forEach((el) => {
      el.addEventListener('pointerenter', handleEnter);
      el.addEventListener('pointerleave', handleLeave);
      el.addEventListener('pointermove', handleMove);
    });
  };
  setTimeout(attach, 0);
}
