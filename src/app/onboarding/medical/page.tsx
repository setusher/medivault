'use client';

import { useEffect, useMemo, useState, useId } from 'react';

/** ---------- Types ---------- */
type UploadedFile = { name: string; url: string; path: string };

type Form = {
  // A. Profile (all optional)
  fullName: string;
  dob: string;
  biologicalSex: 'Male' | 'Female' | 'Intersex' | 'Prefer not to say' | '';
  heightCm: string;
  weightKg: string;
  timezone: string;
  cityCountry: string;

  // B. Contact prefs (optional)
  primaryChannel: 'WhatsApp' | 'Email' | 'SMS' | 'In-app' | '';
  language: string;

  // C. Goals (optional)
  topGoals: string[];
  successDefinition: string;

  // D. Health snapshot (optional)
  conditions: string[];
  medsFreeText: string;
  allergiesFreeText: string;
  familyHistoryBrief: string;
  rhr: string;
  bpSys: string; 
  bpDia: string;

  // E. Documents (optional)
  uploads: UploadedFile[];
};

/** ---------- Constants ---------- */
const DEFAULT_TZ = 'Asia/Kolkata';
const LANGS = ['English', 'Hindi', 'Other'];
const GOALS = ['Heart-risk reduction','Sleep','Fitness/VO₂max','Stress','Metabolic health'];
const CONDITIONS = ['Hypertension','High cholesterol','Diabetes/Prediabetes','Thyroid','Asthma/COPD','GI','Kidney','Liver','Depression/Anxiety','ADHD','Musculoskeletal','Cancer','None'];

/** ---------- Component ---------- */
export default function MedicalOnboarding() {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize form with empty values
  const [form, setForm] = useState<Form>({
    fullName: '', dob: '', biologicalSex: '',
    heightCm: '', weightKg: '', timezone: DEFAULT_TZ, cityCountry: '',
    primaryChannel: '', language: LANGS[0],
    topGoals: [], successDefinition: '',
    conditions: [],
    medsFreeText: '',
    allergiesFreeText: '',
    familyHistoryBrief: '',
    rhr: '',
    bpSys: '', bpDia: '',
    uploads: [],
  });

  /** ---------- Helpers ---------- */
  function updateField<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  /** ---------- Mock file upload ---------- */
  async function mockUploadFiles(files: File[]): Promise<UploadedFile[]> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return files.map(file => ({
      name: file.name,
      url: `mock://uploaded/${file.name}`,
      path: `uploads/${file.name}`
    }));
  }

  /** ---------- Submit ---------- */
  async function handleSubmit() {
    setBusy(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Form submitted:', form);
      setSuccess(true);
      
      // Auto-hide success message
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setBusy(false);
    }
  }

  /** ---------- Render ---------- */
  return (
    <main style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Medical Profile</h1>
        <p style={styles.subtitle}>Fill out any information you'd like to share (all fields are optional)</p>

        {/* A. Profile */}
        <Section title="Personal Information">
          <Row>
            <Field label="Full name">
              <input 
                style={styles.input} 
                value={form.fullName} 
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Enter your full name"
              />
            </Field>
            <Field label="Date of birth">
              <input 
                style={styles.input} 
                type="date" 
                value={form.dob} 
                onChange={(e) => updateField('dob', e.target.value)} 
              />
            </Field>
          </Row>

          <Row>
            <Field label="Biological sex">
              <RadioGroup
                value={form.biologicalSex}
                options={['Male','Female','Intersex','Prefer not to say']}
                onChange={(v) => updateField('biologicalSex', v as any)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Height (cm)">
              <input 
                style={styles.input} 
                type="number" 
                placeholder="170" 
                value={form.heightCm} 
                onChange={(e) => updateField('heightCm', e.target.value)} 
              />
            </Field>
            <Field label="Weight (kg)">
              <input 
                style={styles.input} 
                type="number" 
                placeholder="70" 
                value={form.weightKg} 
                onChange={(e) => updateField('weightKg', e.target.value)} 
              />
            </Field>
          </Row>

          <Row>
            <Field label="Timezone">
              <select style={styles.input} value={form.timezone} onChange={(e) => updateField('timezone', e.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </Field>
            <Field label="Location">
              <input 
                style={styles.input} 
                placeholder="City, Country" 
                value={form.cityCountry} 
                onChange={(e) => updateField('cityCountry', e.target.value)} 
              />
            </Field>
          </Row>
        </Section>

        {/* B. Contact */}
        <Section title="Communication Preferences">
          <Row>
            <Field label="Preferred contact method">
              <select style={styles.input} value={form.primaryChannel} onChange={(e) => updateField('primaryChannel', e.target.value as any)}>
                <option value="">Select option...</option>
                <option>WhatsApp</option>
                <option>Email</option>
                <option>SMS</option>
                <option>In-app</option>
              </select>
            </Field>
            <Field label="Language">
              <select style={styles.input} value={form.language} onChange={(e) => updateField('language', e.target.value)}>
                {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </Row>
        </Section>

        {/* C. Goals */}
        <Section title="Health Goals">
          <Field label="Primary health goals (select up to 3)">
            <ChipBox
              options={GOALS}
              values={form.topGoals}
              onToggle={(v) => {
                const exists = form.topGoals.includes(v);
                const next = exists ? form.topGoals.filter(x => x !== v) : [...form.topGoals, v];
                updateField('topGoals', next.slice(0, 3));
              }}
            />
          </Field>
          <Field label="What does success look like for you?">
            <input 
              style={styles.input} 
              placeholder="Describe your health goals..." 
              value={form.successDefinition} 
              onChange={(e) => updateField('successDefinition', e.target.value)} 
            />
          </Field>
        </Section>

        {/* D. Health snapshot */}
        <Section title="Health Information">
          <Field label="Medical conditions">
            <ChipBox 
              options={CONDITIONS} 
              values={form.conditions} 
              onToggle={(v) => toggleChip('conditions', v)} 
            />
          </Field>
          
          <Field label="Current medications & supplements">
            <textarea 
              style={styles.textarea} 
              placeholder="List any medications, supplements, or treatments you're currently taking..." 
              value={form.medsFreeText} 
              onChange={(e) => updateField('medsFreeText', e.target.value)} 
            />
          </Field>
          
          <Field label="Allergies & intolerances">
            <textarea 
              style={styles.textarea} 
              placeholder="List any known allergies or food intolerances..." 
              value={form.allergiesFreeText} 
              onChange={(e) => updateField('allergiesFreeText', e.target.value)} 
            />
          </Field>
          
          <Field label="Family medical history">
            <textarea 
              style={styles.textarea} 
              placeholder="Any relevant family medical history..." 
              value={form.familyHistoryBrief} 
              onChange={(e) => updateField('familyHistoryBrief', e.target.value)} 
            />
          </Field>

          <Row>
            <Field label="Resting heart rate (bpm)">
              <input 
                style={styles.input} 
                type="number" 
                placeholder="72" 
                value={form.rhr} 
                onChange={(e) => updateField('rhr', e.target.value)} 
              />
            </Field>
            <Field label="Blood pressure">
              <div style={{ display:'flex', gap:8 }}>
                <input 
                  style={{...styles.input, flex:1}} 
                  type="number" 
                  placeholder="Systolic" 
                  value={form.bpSys} 
                  onChange={(e) => updateField('bpSys', e.target.value)} 
                />
                <input 
                  style={{...styles.input, flex:1}} 
                  type="number" 
                  placeholder="Diastolic" 
                  value={form.bpDia} 
                  onChange={(e) => updateField('bpDia', e.target.value)} 
                />
              </div>
            </Field>
          </Row>
        </Section>

        {/* E. Documents */}
        <Section title="Medical Documents">
          <Field label="Upload medical reports or test results">
            <FileUploader
              onUpload={async (files) => {
                const uploaded = await mockUploadFiles(files);
                updateField('uploads', [...form.uploads, ...uploaded]);
              }}
            />
            {form.uploads.length > 0 && <FileList items={form.uploads} />}
          </Field>
        </Section>

        {success && <div style={styles.success}>Profile saved successfully! ✓</div>}

        <button type="button" style={styles.submitBtn} disabled={busy} onClick={handleSubmit}>
          {busy ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </main>
  );

  /** ----- Helper functions ----- */
  function toggleChip(key: 'conditions' | 'topGoals', val: string) {
    const arr = form[key];
    const next = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
    updateField(key, key === 'topGoals' ? next.slice(0, 3) as any : next as any);
  }

  function Row({ children }: { children: React.ReactNode }) {
    return <div style={styles.row}>{children}</div>;
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={styles.field}>
        <label style={styles.label}>{label}</label>
        {children}
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <div style={styles.sectionContent}>{children}</div>
      </section>
    );
  }

  function RadioGroup({
    value, options, onChange
  }: { value: string; options: string[]; onChange:(v:string)=>void }) {
    const name = useId();
    return (
      <div style={styles.radioGroup}>
        {options.map(opt => (
          <label key={opt} style={styles.radioLabel}>
            <input
              type="radio"
              name={name}
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  function ChipBox({
    options, values, onToggle
  }: { options: string[]; values: string[]; onToggle: (v: string) => void }) {
    return (
      <div style={styles.chipContainer}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            style={values.includes(option) ? styles.chipActive : styles.chip}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  function FileUploader({ onUpload }:{ onUpload:(files:File[])=>Promise<void> }) {
    return (
      <input
        style={styles.fileInput}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onUpload(files);
        }}
      />
    );
  }

  function FileList({ items }:{ items:UploadedFile[] }) {
    return (
      <div style={styles.fileList}>
        {items.map((file, i) => (
          <div key={i} style={styles.fileItem}>
            📄 {file.name}
          </div>
        ))}
      </div>
    );
  }
}

/** ---------- Styles ---------- */
const styles: Record<string, React.CSSProperties> = {
  wrap: { 
    minHeight: '100vh', 
    background: 'linear-gradient(135deg, #d8e2dc, #ffe5d9)',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  card: { 
    width: '100%', 
    maxWidth: '800px',
    background: '#ffffff',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 20px 40px rgba(157, 129, 137, 0.15)',
    border: '1px solid rgba(244, 172, 183, 0.2)'
  },
  h1: { 
    margin: '0 0 8px 0', 
    fontSize: '2.2rem', 
    fontWeight: '800',
    color: '#9d8189',
    textAlign: 'center'
  },
  subtitle: {
    textAlign: 'center',
    color: '#9d8189',
    marginBottom: '32px',
    fontSize: '1.1rem'
  },
  section: { 
    marginBottom: '32px',
    padding: '24px',
    background: 'rgba(216, 226, 220, 0.3)',
    borderRadius: '16px',
    border: '1px solid rgba(244, 172, 183, 0.2)'
  },
  sectionTitle: { 
    margin: '0 0 20px 0', 
    fontSize: '1.4rem', 
    fontWeight: '700',
    color: '#9d8189'
  },
  sectionContent: {
    display: 'grid',
    gap: '16px'
  },
  row: { 
    display: 'grid', 
    gap: '16px', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
  },
  field: {
    display: 'grid',
    gap: '8px'
  },
  label: { 
    fontSize: '0.9rem', 
    fontWeight: '600',
    color: '#9d8189'
  },
  input: { 
    padding: '12px 16px', 
    borderRadius: '12px', 
    border: '2px solid rgba(244, 172, 183, 0.3)',
    background: '#ffffff',
    color: '#9d8189',
    fontSize: '1rem',
    transition: 'border-color 0.2s ease',
    outline: 'none'
  },
  textarea: { 
    padding: '12px 16px', 
    minHeight: '80px', 
    borderRadius: '12px', 
    border: '2px solid rgba(244, 172, 183, 0.3)',
    background: '#ffffff',
    color: '#9d8189',
    fontSize: '1rem',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none'
  },
  radioGroup: { 
    display: 'flex', 
    flexWrap: 'wrap', 
    gap: '16px'
  },
  radioLabel: { 
    display: 'flex', 
    gap: '8px', 
    alignItems: 'center',
    cursor: 'pointer',
    color: '#9d8189'
  },
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  chip: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '2px solid rgba(244, 172, 183, 0.4)',
    background: '#ffffff',
    color: '#9d8189',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  chipActive: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '2px solid #f4acb7',
    background: '#ffcad4',
    color: '#9d8189',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  fileInput: {
    padding: '12px',
    borderRadius: '12px',
    border: '2px dashed rgba(244, 172, 183, 0.4)',
    background: 'rgba(255, 202, 212, 0.2)',
    color: '#9d8189',
    cursor: 'pointer'
  },
  fileList: {
    marginTop: '12px',
    display: 'grid',
    gap: '8px'
  },
  fileItem: {
    padding: '8px 12px',
    background: 'rgba(255, 229, 217, 0.5)',
    borderRadius: '8px',
    color: '#9d8189',
    fontSize: '0.9rem'
  },
  submitBtn: { 
    width: '100%',
    marginTop: '24px', 
    padding: '16px 24px', 
    background: 'linear-gradient(135deg, #f4acb7, #ffcad4)',
    color: '#9d8189', 
    fontWeight: '700',
    fontSize: '1.1rem',
    borderRadius: '12px', 
    border: 'none', 
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 12px rgba(244, 172, 183, 0.3)'
  },
  success: { 
    marginTop: '16px',
    padding: '12px 16px',
    background: 'rgba(216, 226, 220, 0.8)',
    border: '2px solid rgba(216, 226, 220, 1)',
    color: '#9d8189',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '600'
  }
};