'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';

type FormState = {
  fullName: string;
  dob: string;
  bloodGroup: string;
  heightCm: string;
  weightKg: string;
  allergies: string;
  medications: string;
  chronicConditions: string;
  pastSurgeries: string;
  familyHistory: string;
  lifestyleSmoking: string;
  lifestyleAlcohol: string;
  currentSymptoms: string;
  primaryPhysician: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  consentToStore: boolean;
};

const initialState: FormState = {
  fullName: '',
  dob: '',
  bloodGroup: '',
  heightCm: '',
  weightKg: '',
  allergies: '',
  medications: '',
  chronicConditions: '',
  pastSurgeries: '',
  familyHistory: '',
  lifestyleSmoking: 'never',
  lifestyleAlcohol: 'none',
  currentSymptoms: '',
  primaryPhysician: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  consentToStore: false,
};

export default function MedicalOnboarding() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialState);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const auth = await getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, (u) => {
        if (!u) router.replace('/auth');
        else setUid(u.uid);
      });
      return () => unsub();
    })();
  }, [router]);

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);

    if (!uid) return;
    if (!form.consentToStore) {
      setErr('Please agree to data storage to continue.');
      return;
    }

    setBusy(true);
    try {
      const db = getFirestoreDB();
      const ref = doc(db, 'users', uid);
      await setDoc(ref, {
        medicalProfile: {
          ...form,
          heightCm: form.heightCm ? Number(form.heightCm) : null,
          weightKg: form.weightKg ? Number(form.weightKg) : null,
          updatedAt: serverTimestamp(),
        },
      }, { merge: true });

      setOk('Profile saved successfully! Redirecting...');
      setTimeout(() => router.replace('/'), 1500);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerIcon}></div>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Medical Profile Setup</h1>
            <p style={styles.subtitle}>
              Complete your health profile to get personalized recommendations and secure data management.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.formCard}>
          <div style={styles.sectionTitle}>Personal Information</div>
          <div style={styles.grid}>
            <Field label="Full Name" required>
              <input
                style={styles.input}
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                required
              />
            </Field>
            
            <Field label="Date of Birth" required>
              <input
                style={styles.input}
                type="date"
                value={form.dob}
                onChange={(e) => update('dob', e.target.value)}
                required
              />
            </Field>
            
            <Field label="Blood Group">
              <input
                style={styles.input}
                placeholder="e.g., O+, A-, B+"
                value={form.bloodGroup}
                onChange={(e) => update('bloodGroup', e.target.value)}
              />
            </Field>
          </div>

          <div style={styles.sectionTitle}>Physical Measurements</div>
          <div style={styles.grid}>
            <Field label="Height (cm)">
              <input
                style={styles.input}
                type="number"
                placeholder="170"
                min={1}
                value={form.heightCm}
                onChange={(e) => update('heightCm', e.target.value)}
              />
            </Field>
            
            <Field label="Weight (kg)">
              <input
                style={styles.input}
                type="number"
                placeholder="70"
                min={1}
                value={form.weightKg}
                onChange={(e) => update('weightKg', e.target.value)}
              />
            </Field>
          </div>

          <div style={styles.sectionTitle}>Medical History</div>
          <div style={styles.grid}>
            <Field label="Allergies">
              <textarea
                style={styles.textarea}
                placeholder="Penicillin, peanuts, shellfish..."
                value={form.allergies}
                onChange={(e) => update('allergies', e.target.value)}
              />
            </Field>
            
            <Field label="Current Medications">
              <textarea
                style={styles.textarea}
                placeholder="Medication name, dosage, frequency..."
                value={form.medications}
                onChange={(e) => update('medications', e.target.value)}
              />
            </Field>
            
            <Field label="Chronic Conditions">
              <textarea
                style={styles.textarea}
                placeholder="Diabetes, hypertension, asthma..."
                value={form.chronicConditions}
                onChange={(e) => update('chronicConditions', e.target.value)}
              />
            </Field>
            
            <Field label="Past Surgeries">
              <textarea
                style={styles.textarea}
                placeholder="Previous surgeries or hospitalizations..."
                value={form.pastSurgeries}
                onChange={(e) => update('pastSurgeries', e.target.value)}
              />
            </Field>
            
            <Field label="Family Medical History">
              <textarea
                style={styles.textarea}
                placeholder="Heart disease, cancer, genetic conditions..."
                value={form.familyHistory}
                onChange={(e) => update('familyHistory', e.target.value)}
              />
            </Field>
            
            <Field label="Current Symptoms">
              <textarea
                style={styles.textarea}
                placeholder="Any current symptoms or concerns..."
                value={form.currentSymptoms}
                onChange={(e) => update('currentSymptoms', e.target.value)}
              />
            </Field>
          </div>

          <div style={styles.sectionTitle}>Lifestyle Information</div>
          <div style={styles.grid}>
            <Field label="Smoking Status">
              <select
                style={styles.select}
                value={form.lifestyleSmoking}
                onChange={(e) => update('lifestyleSmoking', e.target.value as any)}
              >
                <option value="never">Never smoked</option>
                <option value="former">Former smoker</option>
                <option value="current">Current smoker</option>
              </select>
            </Field>
            
            <Field label="Alcohol Consumption">
              <select
                style={styles.select}
                value={form.lifestyleAlcohol}
                onChange={(e) => update('lifestyleAlcohol', e.target.value as any)}
              >
                <option value="none">None</option>
                <option value="occasional">Occasional</option>
                <option value="regular">Regular</option>
              </select>
            </Field>
          </div>

          <div style={styles.sectionTitle}>Healthcare Contacts</div>
          <div style={styles.grid}>
            <Field label="Primary Physician">
              <input
                style={styles.input}
                placeholder="Dr. Smith, Family Medicine"
                value={form.primaryPhysician}
                onChange={(e) => update('primaryPhysician', e.target.value)}
              />
            </Field>
            
            <Field label="Emergency Contact Name">
              <input
                style={styles.input}
                placeholder="Emergency contact full name"
                value={form.emergencyContactName}
                onChange={(e) => update('emergencyContactName', e.target.value)}
              />
            </Field>
            
            <Field label="Emergency Contact Phone">
              <input
                style={styles.input}
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={form.emergencyContactPhone}
                onChange={(e) => update('emergencyContactPhone', e.target.value)}
              />
            </Field>
          </div>

          <div style={styles.consentSection}>
            <label style={styles.consentRow}>
              <input
                type="checkbox"
                checked={form.consentToStore}
                onChange={(e) => update('consentToStore', e.target.checked)}
                style={styles.checkbox}
              />
              <div style={styles.consentText}>
                <strong>Data Storage Consent</strong>
                <p>I consent to securely store this medical information in MediVault. This data will be encrypted and used only for providing healthcare services.</p>
              </div>
            </label>
          </div>

          {err && <div style={styles.error}>{err}</div>}
          {ok && <div style={styles.success}>{ok}</div>}

          <div style={styles.actions}>
            <button type="submit" style={styles.primaryBtn} disabled={busy || !uid}>
              {busy ? 'Saving Profile...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children, required }: { 
  label: string; 
  children: React.ReactNode; 
  required?: boolean;
}) {
  return (
    <div style={styles.field}>
      <label style={styles.fieldLabel}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>
      {children}
    </div>
  );
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
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(34, 197, 94, 0.25)',
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
  formCard: {
    background: 'white',
    borderRadius: 20,
    padding: 32,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: '#1a202c',
    marginBottom: 20,
    marginTop: 32,
    paddingBottom: 8,
    borderBottom: '2px solid #f1f5f9',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 20,
    marginBottom: 24,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  fieldLabel: {
    fontSize: '0.95rem',
    fontWeight: 500,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  required: {
    color: '#ef4444',
    fontSize: '1rem',
  },
  input: {
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#fafafa',
    color: '#1a202c',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  textarea: {
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#fafafa',
    color: '#1a202c',
    fontSize: '1rem',
    minHeight: 100,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  select: {
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#fafafa',
    color: '#1a202c',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  consentSection: {
    marginTop: 32,
    padding: 20,
    background: '#f8fafc',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
  },
  consentRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    cursor: 'pointer',
  },
  checkbox: {
    width: 18,
    height: 18,
    marginTop: 2,
    cursor: 'pointer',
  },
  consentText: {
    flex: 1,
    color: '#374151',
  },
  actions: {
    marginTop: 32,
    display: 'flex',
    justifyContent: 'center',
  },
  primaryBtn: {
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: 'white',
    fontWeight: 600,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    boxShadow: '0 8px 24px rgba(34, 197, 94, 0.25)',
    transition: 'all 0.3s ease',
    minWidth: 200,
  },
  error: {
    color: '#ef4444',
    fontSize: '1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    padding: '16px 20px',
    borderRadius: 12,
    border: '1px solid rgba(239, 68, 68, 0.2)',
    marginTop: 20,
    textAlign: 'center' as const,
  },
  success: {
    color: '#16a34a',
    fontSize: '1rem',
    background: 'rgba(34, 197, 94, 0.1)',
    padding: '16px 20px',
    borderRadius: 12,
    border: '1px solid rgba(34, 197, 94, 0.2)',
    marginTop: 20,
    textAlign: 'center' as const,
  },
};