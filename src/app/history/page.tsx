'use client';

import { useEffect, useMemo, useState } from 'react';




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
  const [uid, setUid] = useState<string | null>('demo-user');
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Mock Firebase auth and data loading
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Simulate auth check
        setAuthLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock user authentication
        const mockUser = { uid: 'demo-user-123' };
        setUid(mockUser.uid);
        setAuthLoading(false);

        // Simulate fetching medical profile
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock medical profile data
        const mockProfile: MedicalProfile = {
          fullName: "Sarah Johnson",
          dob: "1988-03-22",
          biologicalSex: "Female",
          heightCm: 165,
          weightKg: 62,
          timezone: "Asia/Kolkata",
          cityCountry: "Delhi, India",
          primaryChannel: "WhatsApp",
          language: "English",
          topGoals: ["Heart-risk reduction", "Stress", "Sleep"],
          successDefinition: "Reduce stress levels and improve sleep quality for better heart health",
          conditions: ["Hypertension", "Depression/Anxiety"],
          medsFreeText: "Amlodipine 5mg daily for blood pressure, Sertraline 50mg for anxiety, Magnesium supplement 200mg before bed",
          allergiesFreeText: "Latex - contact dermatitis, Aspirin - stomach upset, Dairy - mild lactose intolerance",
          familyHistoryBrief: "Mother - breast cancer at 52, Father - heart disease, Grandmother - diabetes",
          rhr: 68,
          bpSys: 118,
          bpDia: 76,
          uploads: [
            { name: "Annual_Checkup_2024.pdf", url: "#", path: "uploads/annual_checkup_2024.pdf" },
            { name: "Blood_Work_Results.pdf", url: "#", path: "uploads/blood_work_2024.pdf" },
            { name: "Cardiology_Report.pdf", url: "#", path: "uploads/cardiology_report.pdf" }
          ],
          updatedAt: new Date()
        };
        
        setProfile(mockProfile);
      } catch (error: any) {
        console.error('Error loading data:', error);
        setErr(`Error: ${error.message || 'Failed to load medical data'}`);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const profileSections = useMemo(() => {
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

  if (authLoading) {
    return (
      <main style={styles.wrap}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}></div>
          <p style={styles.loadingText}>Authenticating...</p>
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
          <div style={styles.headerIcon}>
            <div style={styles.headerIconInner}></div>
          </div>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Medical History</h1>
            <p style={styles.subtitle}>
              Your comprehensive health profile and medical information
            </p>
          </div>
          <button onClick={() => alert('Edit functionality would navigate to form')} style={styles.editButton}>
            <span>Edit Profile</span>
            <div style={styles.buttonRipple}></div>
          </button>
        </div>

        {err && (
          <div style={styles.errorCard}>
            <h3 style={styles.errorTitle}>Permission Error</h3>
            <p style={styles.errorMessage}>{err}</p>
            <div style={styles.errorHelp}>
              <p><strong>To connect to your actual Firebase data:</strong></p>
              <ol style={styles.errorList}>
                <li>Uncomment the Firebase import lines in the useEffect</li>
                <li>Make sure your Firestore rules allow: <code>allow read, write: if request.auth != null && request.auth.uid == userId;</code></li>
                <li>Ensure the medical form writes to: <code>/users/{`{userId}`}/medicalProfile</code></li>
                <li>Check that the user is properly authenticated</li>
                <li>Verify the document structure matches the form submission</li>
              </ol>
            </div>
            <button onClick={() => setErr(null)} style={styles.dismissButton}>
              Dismiss Error
            </button>
          </div>
        )}

        {!profile ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <div style={styles.emptyIconInner}></div>
            </div>
            <h2 style={styles.emptyTitle}>No Medical Profile Found</h2>
            <p style={styles.emptySubtitle}>
              Complete your medical profile to view your health history and get personalized recommendations.
            </p>
            <button onClick={() => alert('Create profile functionality')} style={styles.primaryButton}>
              <span>Create Medical Profile</span>
              <div style={styles.buttonGlow}></div>
            </button>
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
          <button onClick={() => alert('Navigate to dashboard')} style={styles.backButton}>
            <span>← Back to Dashboard</span>
            <div style={styles.buttonRipple}></div>
          </button>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  switch (iconType) {
    case 'personal':
      return {
        ...baseStyle,
        background: '#d8e2dc',
        boxShadow: '0 4px 12px rgba(216, 226, 220, 0.4)',
      };
    case 'goals':
      return {
        ...baseStyle,
        background: '#ffe5d9',
        boxShadow: '0 4px 12px rgba(255, 229, 217, 0.4)',
      };
    case 'medical':
      return {
        ...baseStyle,
        background: '#ffcad4',
        boxShadow: '0 4px 12px rgba(255, 202, 212, 0.4)',
      };
    case 'vitals':
      return {
        ...baseStyle,
        background: '#f4acb7',
        boxShadow: '0 4px 12px rgba(244, 172, 183, 0.4)',
      };
    case 'documents':
      return {
        ...baseStyle,
        background: '#9d8189',
        boxShadow: '0 4px 12px rgba(157, 129, 137, 0.4)',
      };
    default:
      return {
        ...baseStyle,
        background: '#d8e2dc',
        boxShadow: '0 4px 12px rgba(216, 226, 220, 0.4)',
      };
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #d8e2dc, #ffe5d9)',
    padding: '24px 16px',
    color: '#9d8189',
  },
  container: {
    maxWidth: 1000,
    margin: '0 auto',
  },
  loadingCard: {
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 48,
    textAlign: 'center' as const,
    boxShadow: '0 20px 40px rgba(157, 129, 137, 0.15)',
    border: '1px solid rgba(244, 172, 183, 0.2)',
    maxWidth: 400,
    margin: '0 auto',
    color: '#9d8189',
  },
  loadingIcon: {
    width: 48,
    height: 48,
    background: 'linear-gradient(135deg, #f4acb7, #ffcad4)',
    borderRadius: 12,
    margin: '0 auto 16px',
    animation: 'pulse 2s infinite',
  },
  loadingText: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#9d8189',
  },
  header: {
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    boxShadow: '0 20px 40px rgba(157, 129, 137, 0.15)',
    border: '1px solid rgba(244, 172, 183, 0.2)',
  },
  headerIcon: {
    width: 64,
    height: 64,
    background: 'linear-gradient(135deg, #f4acb7, #ffcad4)',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(244, 172, 183, 0.4)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconInner: {
    width: 32,
    height: 32,
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 8,
    color: '#9d8189',
  },
  subtitle: {
    color: '#9d8189',
    fontSize: '1.1rem',
    lineHeight: 1.5,
    margin: 0,
    opacity: 0.8,
  },
  editButton: {
    position: 'relative' as const,
    padding: '12px 20px',
    background: 'rgba(244, 172, 183, 0.2)',
    border: '2px solid rgba(244, 172, 183, 0.4)',
    borderRadius: 12,
    color: '#9d8189',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden' as const,
  },
  buttonRipple: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle, rgba(244, 172, 183, 0.3) 0%, transparent 70%)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
    borderRadius: 12,
  },
  errorCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    border: '2px solid #f87171',
    boxShadow: '0 8px 24px rgba(248, 113, 113, 0.2)',
  },
  errorTitle: {
    color: '#dc2626',
    fontSize: '1.2rem',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  errorMessage: {
    color: '#9d8189',
    fontSize: '1rem',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  },
  errorHelp: {
    background: 'rgba(248, 113, 113, 0.1)',
    padding: '16px',
    borderRadius: '8px',
    margin: '16px 0',
  },
  errorList: {
    color: '#9d8189',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    paddingLeft: '20px',
  },
  dismissButton: {
    padding: '8px 16px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  emptyState: {
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 64,
    textAlign: 'center' as const,
    boxShadow: '0 20px 40px rgba(157, 129, 137, 0.15)',
    border: '1px solid rgba(244, 172, 183, 0.2)',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    background: 'linear-gradient(135deg, #d8e2dc, #ffe5d9)',
    borderRadius: 20,
    margin: '0 auto 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconInner: {
    width: 40,
    height: 40,
    background: 'rgba(157, 129, 137, 0.3)',
    borderRadius: 10,
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: 12,
    color: '#9d8189',
  },
  emptySubtitle: {
    color: '#9d8189',
    fontSize: '1rem',
    lineHeight: 1.6,
    marginBottom: 32,
    maxWidth: 500,
    margin: '0 auto 32px',
    opacity: 0.8,
  },
  primaryButton: {
    position: 'relative' as const,
    display: 'inline-block',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #f4acb7, #ffcad4)',
    color: '#9d8189',
    border: 'none',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: '1rem',
    boxShadow: '0 8px 24px rgba(244, 172, 183, 0.4)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden' as const,
  },
  buttonGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), transparent)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
    borderRadius: 12,
  },
  content: {
    display: 'grid',
    gap: 24,
  },
  section: {
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 8px 24px rgba(157, 129, 137, 0.15)',
    border: '1px solid rgba(244, 172, 183, 0.2)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '2px solid rgba(244, 172, 183, 0.2)',
  },
  sectionIcon: {
    flexShrink: 0,
  },
  sectionIconInner: {
    width: 20,
    height: 20,
    background: 'rgba(157, 129, 137, 0.3)',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#9d8189',
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
    borderBottom: '1px solid rgba(244, 172, 183, 0.2)',
  },
  infoLabel: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#9d8189',
    opacity: 0.8,
  },
  infoValue: {
    fontSize: '1rem',
    color: '#9d8189',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  footer: {
    marginTop: 32,
    textAlign: 'center' as const,
  },
  backButton: {
    position: 'relative' as const,
    padding: '12px 20px',
    background: 'rgba(244, 172, 183, 0.2)',
    border: '2px solid rgba(244, 172, 183, 0.4)',
    borderRadius: 12,
    color: '#9d8189',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden' as const,
  },
};