'use client';

import { useEffect, useMemo, useState, useMemo as useMemo2 } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';

type MedicalProfile = {
  fullName?: string;
  dob?: string;
  biologicalSex?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  timezone?: string;
  cityCountry?: string;
  primaryChannel?: string;
  language?: string;
  topGoals?: string[];
  successDefinition?: string;
  conditions?: string[];
  medsFreeText?: string;
  allergiesFreeText?: string;
  familyHistoryBrief?: string;
  rhr?: number | null;
  bpSys?: number | null;
  bpDia?: number | null;
  uploads?: Array<{name: string; url: string; path: string}>;
  updatedAt?: any;
};

export default function MedicalHistoryDisplay() {
  const db = useMemo(() => getFirestoreDB(), []);
  const [me, setMe] = useState<{ uid: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // auth
  useEffect(() => {
    (async () => {
      const auth = await getFirebaseAuth();
      return onAuthStateChanged(auth, (u) => {
        setMe(u ? { uid: u.uid, email: u.email } : null);
      });
    })();
  }, []);

  // fetch profile (valid paths only)
  useEffect(() => {
    (async () => {
      if (!me?.email) { setLoading(false); return; }
      setLoading(true);
      const memberId = me.email.split('@')[0];

      // Primary: users/{memberId}/meta/medicalProfile (collection/doc)
      let data: any | null = null;
      try {
        const metaDocRef = doc(db, 'users', memberId, 'meta', 'medicalProfile'); // ✅ even segments
        const metaSnap = await getDoc(metaDocRef);
        if (metaSnap.exists()) data = metaSnap.data();
      } catch (_) { /* ignore, fall back below */ }

      // Fallback: users/{memberId} doc with a field "medicalProfile"
      if (!data) {
        const userDocRef = doc(db, 'users', memberId); // ✅ even segments
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists() && userSnap.data()?.medicalProfile) {
          data = userSnap.data().medicalProfile;
        }
      }

      if (data) {
        setProfile({
          fullName: data.fullName ?? '',
          dob: data.dob ?? '',
          biologicalSex: data.biologicalSex ?? '',
          heightCm: data.heightCm ?? null,
          weightKg: data.weightKg ?? null,
          timezone: data.timezone ?? '',
          cityCountry: data.cityCountry ?? '',
          primaryChannel: data.primaryChannel ?? '',
          language: data.language ?? '',
          topGoals: Array.isArray(data.topGoals) ? data.topGoals : [],
          successDefinition: data.successDefinition ?? '',
          conditions: Array.isArray(data.conditions) ? data.conditions : [],
          medsFreeText: data.medsFreeText ?? '',
          allergiesFreeText: data.allergiesFreeText ?? '',
          familyHistoryBrief: data.familyHistoryBrief ?? '',
          rhr: data.rhr ?? null,
          bpSys: data.bpSys ?? null,
          bpDia: data.bpDia ?? null,
          uploads: Array.isArray(data.uploads) ? data.uploads : [],
          updatedAt: data.updatedAt ?? null,
        });
      } else {
        setProfile(null);
      }

      setLoading(false);
    })();
  }, [db, me]);

  const profileSections = useMemo2(() => {
    if (!profile) return [];
    return [
      {
        title: 'Personal Information',
        icon: 'personal',
        items: [
          ['Full Name', profile.fullName ?? ''],
          ['Date of Birth', profile.dob ?? ''],
          ['Biological Sex', profile.biologicalSex ?? ''],
          ['Height', profile.heightCm ? `${profile.heightCm} cm` : ''],
          ['Weight', profile.weightKg ? `${profile.weightKg} kg` : ''],
          ['Location', profile.cityCountry ?? ''],
          ['Timezone', profile.timezone ?? ''],
        ].filter(([, v]) => String(v).trim().length > 0)
      },
      {
        title: 'Communication & Goals',
        icon: 'goals',
        items: [
          ['Preferred Contact', profile.primaryChannel ?? ''],
          ['Language', profile.language ?? ''],
          ['Health Goals', profile.topGoals?.join(', ') ?? ''],
          ['Success Definition', profile.successDefinition ?? ''],
        ].filter(([, v]) => String(v).trim().length > 0)
      },
      {
        title: 'Medical History',
        icon: 'medical',
        items: [
          ['Medical Conditions', profile.conditions?.join(', ') ?? ''],
          ['Current Medications', profile.medsFreeText ?? ''],
          ['Allergies & Intolerances', profile.allergiesFreeText ?? ''],
          ['Family History', profile.familyHistoryBrief ?? ''],
        ].filter(([, v]) => String(v).trim().length > 0)
      },
      {
        title: 'Vital Signs',
        icon: 'vitals',
        items: [
          ['Resting Heart Rate', profile.rhr ? `${profile.rhr} bpm` : ''],
          ['Blood Pressure', profile.bpSys && profile.bpDia ? `${profile.bpSys}/${profile.bpDia} mmHg` : ''],
        ].filter(([, v]) => String(v).trim().length > 0)
      },
      {
        title: 'Medical Documents',
        icon: 'documents',
        items: profile.uploads?.map((doc, index) => [`Document ${index + 1}`, doc.name]) ?? []
      }
    ].filter(section => section.items.length > 0);
  }, [profile]);

  if (!me?.email) {
    return (
      <main style={styles.wrap}>
        <div style={styles.loadingCard}>
          <p style={styles.loadingText}>Please sign in to view your medical history.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={styles.wrap}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}></div>
          <p style={styles.loadingText}>Loading your medical history...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerIcon}><div style={styles.headerIconInner}></div></div>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Medical History</h1>
            <p style={styles.subtitle}>Your comprehensive health profile and medical information</p>
          </div>
          <a href="/onboarding/medical" style={styles.editButton}>Edit Profile</a>
        </div>

        {!profile ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}><div style={styles.emptyIconInner}></div></div>
            <h2 style={styles.emptyTitle}>No Medical Profile Found</h2>
            <p style={styles.emptySubtitle}>Complete your medical profile to view your health history and get personalized recommendations.</p>
            <a href="/onboarding/medical" style={styles.primaryButton}><span>Create Medical Profile</span><div style={styles.buttonGlow}></div></a>
          </div>
        ) : (
          <div style={styles.content}>
            {profileSections.map((section) => (
              <div key={section.title} style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={{...styles.sectionIcon, ...getSectionIconStyle(section.icon)}}>
                    <div style={styles.sectionIconInner}></div>
                  </div>
                  <h2 style={styles.sectionTitle}>{section.title}</h2>
                </div>
                <div style={styles.sectionContent}>
                  {section.items.map(([label, value]) => (
                    <div key={label} style={styles.infoItem}>
                      <div style={styles.infoLabel}>{label}</div>
                      <div style={styles.infoValue}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={styles.footer}>
          <a href="/" style={styles.backButton}><span>← Back to Dashboard</span><div style={styles.buttonRipple}></div></a>
        </div>
      </div>
    </main>
  );
}

function getSectionIconStyle(iconType: string): React.CSSProperties {
  const baseStyle = { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  switch (iconType) {
    case 'personal':  return { ...baseStyle, background: '#d8e2dc', boxShadow: '0 4px 12px rgba(216,226,220,.4)' };
    case 'goals':     return { ...baseStyle, background: '#ffe5d9', boxShadow: '0 4px 12px rgba(255,229,217,.4)' };
    case 'medical':   return { ...baseStyle, background: '#ffcad4', boxShadow: '0 4px 12px rgba(255,202,212,.4)' };
    case 'vitals':    return { ...baseStyle, background: '#f4acb7', boxShadow: '0 4px 12px rgba(244,172,183,.4)' };
    case 'documents': return { ...baseStyle, background: '#9d8189', boxShadow: '0 4px 12px rgba(157,129,137,.4)' };
    default:          return { ...baseStyle, background: '#d8e2dc', boxShadow: '0 4px 12px rgba(216,226,220,.4)' };
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: '100vh', background: 'linear-gradient(135deg, #d8e2dc, #ffe5d9)', padding: '24px 16px', color: '#9d8189' },
  container: { maxWidth: 1000, margin: '0 auto' },
  loadingCard: { background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: 48, textAlign: 'center', boxShadow: '0 20px 40px rgba(157,129,137,.15)', border: '1px solid rgba(244,172,183,.2)', maxWidth: 400, margin: '0 auto', color: '#9d8189' },
  loadingIcon: { width: 48, height: 48, background: 'linear-gradient(135deg, #f4acb7, #ffcad4)', borderRadius: 12, margin: '0 auto 16px' },
  loadingText: { margin: 0, fontSize: '1.1rem', color: '#9d8189' },
  header: { background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: 32, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 20px 40px rgba(157,129,137,.15)', border: '1px solid rgba(244,172,183,.2)' },
  headerIcon: { width: 64, height: 64, background: 'linear-gradient(135deg, #f4acb7, #ffcad4)', borderRadius: 16, boxShadow: '0 8px 24px rgba(244,172,183,.4)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerIconInner: { width: 32, height: 32, background: 'rgba(255,255,255,.5)', borderRadius: 8 },
  headerContent: { flex: 1 },
  title: { fontSize: '2rem', fontWeight: 700, marginBottom: 8, color: '#9d8189' },
  subtitle: { color: '#9d8189', fontSize: '1.1rem', lineHeight: 1.5, margin: 0, opacity: .8 },
  editButton: { padding: '12px 20px', background: 'rgba(244,172,183,.2)', border: '2px solid rgba(244,172,183,.4)', borderRadius: 12, color: '#9d8189', fontSize: '.95rem', fontWeight: 600, textDecoration: 'none' },
  emptyState: { background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: 64, textAlign: 'center', boxShadow: '0 20px 40px rgba(157,129,137,.15)', border: '1px solid rgba(244,172,183,.2)' },
  emptyIcon: { width: 80, height: 80, background: 'linear-gradient(135deg,#d8e2dc,#ffe5d9)', borderRadius: 20, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyIconInner: { width: 40, height: 40, background: 'rgba(157,129,137,.3)', borderRadius: 10 },
  emptyTitle: { fontSize: '1.5rem', fontWeight: 600, marginBottom: 12, color: '#9d8189' },
  emptySubtitle: { color: '#9d8189', fontSize: '1rem', lineHeight: 1.6, marginBottom: 32, maxWidth: 500, marginInline: 'auto', opacity: .8 },
  primaryButton: { position: 'relative', display: 'inline-block', padding: '14px 28px', background: 'linear-gradient(135deg,#f4acb7,#ffcad4)', color: '#9d8189', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '1rem', textDecoration: 'none' },
  content: { display: 'grid', gap: 24 },
  section: { background: 'rgba(255,255,255,.9)', borderRadius: 16, padding: 24, boxShadow: '0 8px 24px rgba(157,129,137,.15)', border: '1px solid rgba(244,172,183,.2)' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid rgba(244,172,183,.2)' },
  sectionIcon: { flexShrink: 0 },
  sectionIconInner: { width: 20, height: 20, background: 'rgba(157,129,137,.3)', borderRadius: 5 },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 600, color: '#9d8189', margin: 0 },
  sectionContent: { display: 'grid', gap: 16 },
  infoItem: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, padding: '12px 0', alignItems: 'flex-start', borderBottom: '1px solid rgba(244,172,183,.2)' },
  infoLabel: { fontSize: '.95rem', fontWeight: 600, color: '#9d8189', opacity: .8 },
  infoValue: { fontSize: '1rem', color: '#9d8189', lineHeight: 1.5, fontWeight: 500 },
  footer: { marginTop: 32, textAlign: 'center' },
  backButton: { position: 'relative', padding: '12px 20px', background: 'rgba(244,172,183,.2)', border: '2px solid rgba(244,172,183,.4)', borderRadius: 12, color: '#9d8189', fontSize: '.95rem', fontWeight: 600, textDecoration: 'none' },
};
