'use client';

import Link from 'next/link';

/* Shared palette & helpers (same vibe as dashboard) */
const P = {
  p1: '#fadde1', p2: '#ffc4d6', p3: '#ffa6c1', p4: '#ff87ab', p5: '#ff5d8f',
  p6: '#ff97b7', p7: '#ffacc5', p8: '#ffcad4', p9: '#f4acb7',
};
const alpha = (hex: string, a = 0.5) => {
  const c = Number.parseInt(hex.replace('#', ''), 16);
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return `rgba(${r},${g},${b},${a})`;
};
const softGlow = (color: string, s = 0.5) =>
  `0 10px 28px ${alpha(color, s)}, 0 0 64px ${alpha(color, s * 0.6)}`;
const glassBorder = (o = 0.14): React.CSSProperties => ({
  border: `1px solid ${alpha('#ffffff', o)}`, backdropFilter: 'blur(18px)',
});
const glowPill = (a: string, b: string): React.CSSProperties => ({
  padding: '12px 18px', borderRadius: 14, fontWeight: 800, letterSpacing: .3,
  color: '#3c1d2a', textDecoration: 'none',
  background: `linear-gradient(135deg, ${a}, ${b})`, boxShadow: softGlow(b, .45),
});

export default function AuthLanding() {
  return (
    <main style={styles.wrap}>
      {/* background plumes */}
      <div aria-hidden style={styles.bg} />
      <div style={{ ...styles.card, ...glassBorder(0.16) }} data-raise>
        <div style={styles.logoWrap}>
          <div style={{ ...styles.logo, background: `linear-gradient(135deg, ${P.p3}, ${P.p5})`, boxShadow: softGlow(P.p5, .4) }}>
            <div style={styles.logoInner} />
          </div>
        </div>
        <h1 style={styles.title}>Welcome to MediVault</h1>
        <p style={styles.subtitle}>Your friendly, secure home for medical data.</p>

        <div style={styles.btnRow}>
          <Link href="/auth/signup" style={{ ...glowPill(P.p2, P.p5) }} data-raise>
            Create New Account
          </Link>
          <Link href="/auth/login" style={{ ...styles.secondaryBtn, ...glassBorder(0.12) }} data-raise>
            <span>Sign In</span>
            <div style={styles.buttonRipple}></div>
          </Link>
        </div>

        {/* <div style={styles.features}>
          <Feature text="Bank-level security" />
          <Feature text="HIPAA-ready workflows" />
          <Feature text="Access anywhere" />
        </div> */}
      </div>
    </main>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div style={styles.feature}>
      <div style={styles.featureDot} />
      <span>{text}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, position: 'relative', color: '#3c1d2a' },
  bg: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: `
      radial-gradient(1100px 700px at 15% -10%, ${alpha('#fff', .28)} 0%, transparent 60%),
      radial-gradient(900px 700px at 110% 10%, ${alpha(P.p2, .45)} 0%, transparent 65%),
      radial-gradient(900px 700px at -10% 80%, ${alpha(P.p4, .40)} 0%, transparent 60%),
      linear-gradient(135deg, ${P.p8}, ${P.p9} 35%, ${P.p7})
    `,
  },
  card: {
    position: 'relative', zIndex: 1, width: 'min(640px, 94vw)',
    borderRadius: 22, padding: 32,
    background: `linear-gradient(145deg, ${alpha('#ffffff', .75)}, ${alpha('#ffffff', .6)})`,
    boxShadow: softGlow(P.p5, .25), textAlign: 'center',
  },
  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  logo: { width: 72, height: 72, borderRadius: 16, display: 'grid', placeItems: 'center' },
  logoInner: { width: 32, height: 32, background: alpha('#fff', .5), borderRadius: 8 },
  title: { margin: '8px 0 6px', fontSize: '2.1rem', fontWeight: 900 },
  subtitle: { margin: 0, opacity: .8 },
  btnRow: { display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0 6px', flexWrap: 'wrap' as const },
  secondaryBtn: {
    position: 'relative', padding: '12px 18px', borderRadius: 14, fontWeight: 800,
    background: alpha('#ffffff', .6), color: '#3c1d2a', textDecoration: 'none',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  buttonRipple: {
    position: 'absolute', inset: 0, borderRadius: 14,
    background: `radial-gradient(120px 60px at var(--x, 50%) var(--y, 50%), ${alpha('#fff', .35)}, transparent 70%)`,
    opacity: 0, transition: 'opacity 200ms ease', pointerEvents: 'none',
  },
  features: { display: 'flex', gap: 14, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' as const },
  feature: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px',
    borderRadius: 999, border: '1px solid rgba(0,0,0,0.06)', background: alpha('#fff', .6), fontWeight: 700, fontSize: 12,
  },
  featureDot: { width: 8, height: 8, borderRadius: 999, background: alpha(P.p5, .9) },
};

/* tiny hover lift */
if (typeof window !== 'undefined') {
  const onMove = (e: MouseEvent) => {
    const t = e.currentTarget as HTMLElement; const r = t.getBoundingClientRect();
    t.style.setProperty('--x', `${e.clientX - r.left}px`); t.style.setProperty('--y', `${e.clientY - r.top}px`);
  };
  const enter = (el: HTMLElement) => { el.style.transform = 'translateY(-3px) scale(1.01)'; el.style.filter = 'brightness(1.02)'; const ripple = el.querySelector<HTMLElement>('div[style*="radial-gradient"]'); if (ripple) ripple.style.opacity = '1'; };
  const leave = (el: HTMLElement) => { el.style.transform = 'none'; el.style.filter = 'none'; const ripple = el.querySelector<HTMLElement>('div[style*="radial-gradient"]'); if (ripple) ripple.style.opacity = '0'; };
  setTimeout(() => document.querySelectorAll<HTMLElement>('[data-raise]').forEach(el => {
    el.addEventListener('pointerenter', () => enter(el));
    el.addEventListener('pointerleave', () => leave(el));
    el.addEventListener('pointermove', onMove as any);
  }), 0);
}
