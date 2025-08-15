'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';

type MedicalProfile = {
  fullName?: string;
  dob?: string;
  bloodGroup?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  allergies?: string;
  medications?: string;
  chronicConditions?: string;
  pastSurgeries?: string;
  familyHistory?: string;
  lifestyleSmoking?: string;
  lifestyleAlcohol?: string;
  currentSymptoms?: string;
  primaryPhysician?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  updatedAt?: any;
};

export default function PastHistoryPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const auth = await getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, async (u) => {
        if (!u) {
          router.replace('/auth');
          return;
        }
        setUid(u.uid);
        try {
          const db = getFirestoreDB();
          const ref = doc(db, 'users', u.uid);
          const snap = await getDoc(ref);
          const data = snap.data() as any;
          setProfile(data?.medicalProfile ?? null);
        } catch (e: any) {
          setErr(e?.message ?? 'Failed to load data');
        } finally {
          setLoading(false);
        }
      });
      return () => unsub();
    })();
  }, [router]);

  const profileSections = useMemo(() => {
    if (!profile) return [];
    
    return [
      {
        title: 'Personal Information',
        icon: 'personal',
        items: [
          ['Full Name', profile.fullName ?? ''],
          ['Date of Birth', profile.dob ?? ''],
          ['Blood Group', profile.bloodGroup ?? ''],
          ['Height', profile.heightCm ? `${profile.heightCm} cm` : ''],
          ['Weight', profile.weightKg ? `${profile.weightKg} kg` : ''],
        ].filter(([, v]) => String(v).trim().length > 0)
      },
      {
        title: 'Medical History',
        icon: 'medical',
        items: [
          ['Allergies', profile.allergies ?? ''],
          ['Current Medications', profile.medications ?? ''],
          ['Chronic Conditions', profile.chronicConditions ?? ''],
          ['Past Surgeries', profile.pastSurgeries ?? ''],
          ['Family History', profile.familyHistory ?? ''],
          ['Current Symptoms', profile.currentSymptoms ?? ''],
        ].filter(([, v]) => String(v).trim().length > 0)
      },
      {
        title: 'Lifestyle Information',
        icon: 'lifestyle',
        items: [
          ['Smoking Status', profile.lifestyleSmoking ?? ''],
          ['Alcohol Consumption', profile.lifestyleAlcohol ?? ''],
        ].filter(([, v]) => String(v).trim().length > 0)
      },
      {
        title: 'Healthcare Contacts',
        icon: 'contacts',
        items: [
          ['Primary Physician', profile.primaryPhysician ?? ''],
          ['Emergency Contact', profile.emergencyContactName ?? ''],
          ['Emergency Phone', profile.emergencyContactPhone ?? ''],
        ].filter(([, v]) => String(v).trim().length > 0)
      }
    ].filter(section => section.items.length > 0);
  }, [profile]);

  if (loading) {
    return (
      <main style={styles.wrap}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}></div>
          <p>Loading your medical history...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerIcon}></div>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Medical History</h1>
            <p style={styles.subtitle}>
              Your comprehensive health profile and medical information
            </p>
          </div>
          <a href="/onboarding/medical" style={styles.editButton}>
            Edit Profile
          </a>
        </div>

        {!profile ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}></div>
            <h2 style={styles.emptyTitle}>No Medical Profile Found</h2>
            <p style={styles.emptySubtitle}>
              Complete your medical profile to view your health history and get personalized recommendations.
            </p>
            <a href="/onboarding/medical" style={styles.primaryButton}>
              Create Medical Profile
            </a>
          </div>
        ) : (
          <div style={styles.content}>
            {profileSections.map((section) => (
              <div key={section.title} style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={{...styles.sectionIcon, ...getSectionIconStyle(section.icon)}}></div>
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

        {err && <div style={styles.error}>{err}</div>}

        <div style={styles.footer}>
          <a href="/" style={styles.backButton}>
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}

function getSectionIconStyle(iconType: string): React.CSSProperties {
  const baseStyle = {
    width: 40,
    height: 40,
    borderRadius: 10,
  };

  switch (iconType) {
    case 'personal':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      };
    case 'medical':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      };
    case 'lifestyle':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      };
    case 'contacts':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      };
    default:
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      };
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fafafa 0%, #f0f4f8 100%)',
    padding: '24px 16px',
  },
  container: {
    maxWidth: 1000,
    margin: '0 auto',
  },
  loadingCard: {
    background: 'white',
    borderRadius: 20,
    padding: 48,
    textAlign: 'center' as const,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    maxWidth: 400,
    margin: '0 auto',
    color: '#64748b',
  },
  loadingIcon: {
    width: 48,
    height: 48,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 12,
    margin: '0 auto 16px',
    animation: 'pulse 2s infinite',
  },
  header: {
    background: 'white',
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  headerIcon: {
    width: 64,
    height: 64,
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(139, 92, 246, 0.25)',
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 8,
    color: '#1a202c',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '1.1rem',
    lineHeight: 1.5,
    margin: 0,
  },
  editButton: {
    padding: '12px 20px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  emptyState: {
    background: 'white',
    borderRadius: 20,
    padding: 64,
    textAlign: 'center' as const,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    borderRadius: 20,
    margin: '0 auto 24px',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: 12,
    color: '#1a202c',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: '1rem',
    lineHeight: 1.6,
    marginBottom: 32,
    maxWidth: 500,
    margin: '0 auto 32px',
  },
  primaryButton: {
    display: 'inline-block',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: 12,
    fontWeight: 600,
    fontSize: '1rem',
    boxShadow: '0 8px 24px rgba(139, 92, 246, 0.25)',
    transition: 'all 0.3s ease',
  },
  content: {
    display: 'grid',
    gap: 24,
  },
  section: {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.04)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid #f1f5f9',
  },
  sectionIcon: {
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1a202c',
    margin: 0,
  },
  sectionContent: {
    display: 'grid',
    gap: 16,
  },
  infoItem: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: 16,
    padding: '12px 0',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: '0.95rem',
    fontWeight: 500,
    color: '#64748b',
  },
  infoValue: {
    fontSize: '1rem',
    color: '#1a202c',
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 32,
    textAlign: 'center' as const,
  },
  backButton: {
    display: 'inline-block',
    padding: '12px 20px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    padding: '16px 20px',
    borderRadius: 12,
    marginTop: 24,
    textAlign: 'center' as const,
  },
};