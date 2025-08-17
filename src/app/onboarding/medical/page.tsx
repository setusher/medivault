'use client';

import { useEffect, useMemo, useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { getFirebaseAuth, getFirestoreDB, getFirebaseStorage } from '@/lib/firebase';

/** ---------- Types ---------- */
type YesNo = 'yes' | 'no';
type Radio3 = 'yes' | 'no' | 'unknown';

type RxRow = { name: string; dose: string; frequency: string; startDate: string };
type OTCRow = { name: string; dose: string; frequency: string; startDate: string };
type SurgeryRow = { title: string; monthYear: string; hospital: string; notes: string };

type ConditionItem = {
  key: string; label: string; selected: boolean; year?: string;
};

type UploadedFile = { name: string; url: string; path: string };

type Form = {
  // A. Profile & Consent
  fullName: string;
  dob: string;
  biologicalSex: 'Male' | 'Female' | 'Intersex' | 'Prefer not to say' | '';
  heightCm: string;
  weightKg: string;
  timezone: string;
  cityCountry: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  consentStore: boolean;
  consentShare: boolean;
  idUploads: UploadedFile[];

  // B. Communication & Preferences
  primaryChannel: 'WhatsApp' | 'Email' | 'SMS' | 'In-app' | '';
  hasAssistant: YesNo;
  assistantName: string;
  assistantContact: string;
  updateStyle: 'Executive summary first' | 'Detailed first' | '';
  callWindows: string[];
  language: string;

  // C. Goals
  topGoals: string[];
  timelines: string;
  successDefinition: string;

  // D. Lifestyle
  occupation: string;
  sleepHours: string;
  sleepIssues: string[];
  activity: 'Sedentary' | 'Light' | 'Moderate' | 'High' | '';
  exerciseDays: string;
  diet: 'Mixed' | 'Vegetarian' | 'Vegan' | 'Mediterranean' | 'Low-carb' | 'Other' | '';
  dietChips: string[];
  alcohol: 'None' | 'Occasional' | 'Weekly' | 'Daily' | '';
  tobacco: 'Never' | 'Former' | 'Current' | '';
  caffeineCups: string;

  // E. Travel
  travelFreq: '~1 week per month' | '2–3 days monthly' | 'Rare' | '';
  travelZones: string[];
  nextTripStart: string;
  nextTripEnd: string;
  jetLagHard: YesNo;

  // F. Medical Conditions
  conditions: ConditionItem[];
  specialistCare: YesNo;
  specialistWhich: string;

  // G. Meds & Supplements
  rx: RxRow[];
  otc: OTCRow[];
  adherence: 'Always' | 'Often' | 'Sometimes' | 'Rarely' | '';
  sideEffects: string;

  // H. Allergies & Intolerances
  drugAllergies: string[]; drugAllergiesFree: string;
  foodAllergies: string[]; foodAllergiesFree: string;
  otherAllergies: string;

  // I. Surgeries/Hospitalizations
  hadSurgery: YesNo;
  surgeries: SurgeryRow[];

  // J. Family History
  famHeartEarly: Radio3;
  famStroke: Radio3;
  famDiabetes: Radio3;
  famCancerTypes: string[];
  famOther: string;

  // K. Measurements & Devices
  bpSys: string; bpDia: string; bpDate: string;
  rhr: string;
  waistCm: string;
  wearable: 'Garmin' | 'Apple Watch' | 'Fitbit' | 'Oura' | 'None' | '';
  wearableConnected: YesNo;

  // L. Recent Tests / Screenings
  hasLabs: YesNo; labUploads: UploadedFile[]; lipidDate: string; ldl: string;
  lastA1c: string;
  perfTests: { date: string; uploads: UploadedFile[] };
  cancerScreening: string;
  recentImaging: YesNo; imagingType: string; imagingUploads: UploadedFile[];

  // M. Pain / PT
  painIssues: string[]; painFreeText: string;
  ptHistory: YesNo; ptDetails: string;

  // N. Constraints & Risks
  timePerWeekHours: string;
  gymAccess: YesNo; gymEquipment: string;
  hiitContra: YesNo; hiitDetails: string;
  pregnancy: YesNo | '';

  // O. Documents
  miscUploads: UploadedFile[];
  anythingElse: string;
};

/** ---------- Constants ---------- */
const DEFAULT_TZ = 'Asia/Singapore';
const LANGS = ['English', 'Hindi', 'Mandarin', 'Spanish', 'Arabic', 'Other'];
const GOALS = ['Heart-risk reduction','Cognition','Body comp','Sleep','Fitness/VO₂max','Stress','Metabolic health','Other'];
const SLEEP_ISSUES = ['Difficulty falling asleep','Night wakings','Snoring','Apnea suspected','None'];
const DIET_TAGS = ['halal/kosher','lactose-free','gluten-free','nut-free','pork-free','low-sodium','low-FODMAP'];
const DRUG_ALLERGY_LIST = ['Penicillin','Sulfa','NSAIDs','Opioids','Contrast dye','Other'];
const FOOD_ALLERGY_LIST = ['Peanuts','Tree nuts','Milk','Eggs','Soy','Fish','Shellfish','Gluten','Other'];
const PAIN_LIST = ['Back','Neck','Shoulder','Knee','Hip','Ankle','Elbow','Wrist','Other'];
const TRAVEL_ZONE_SUGGESTIONS = ['UK','US','Korea','Jakarta','EU','UAE','India','Japan','Singapore'];

const CONDITIONS: ConditionItem[] = [
  { key: 'htn', label: 'Hypertension', selected: false },
  { key: 'lipids', label: 'High cholesterol', selected: false },
  { key: 'dm', label: 'Prediabetes/Diabetes', selected: false },
  { key: 'thyroid', label: 'Thyroid disorder', selected: false },
  { key: 'cvd', label: 'Cardiovascular (CAD/arrhythmia)', selected: false },
  { key: 'resp', label: 'Asthma/COPD', selected: false },
  { key: 'gi', label: 'GI (GERD/IBD)', selected: false },
  { key: 'kidney', label: 'Kidney disease', selected: false },
  { key: 'liver', label: 'Liver disease', selected: false },
  { key: 'mental', label: 'Depression/Anxiety', selected: false },
  { key: 'adhd', label: 'ADHD', selected: false },
  { key: 'msk', label: 'Musculoskeletal (back/knee/shoulder)', selected: false },
  { key: 'cancer', label: 'Cancer (type & year in free text)', selected: false },
  { key: 'other', label: 'Other (free text below)', selected: false },
];

/** ---------- Component ---------- */
export default function MedicalOnboarding() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Init form
  const [form, setForm] = useState<Form>(() => ({
    // A
    fullName: '', dob: '', biologicalSex: '', heightCm: '', weightKg: '',
    timezone: DEFAULT_TZ, cityCountry: '',
    emergencyContactName: '', emergencyContactPhone: '',
    consentStore: false, consentShare: false, idUploads: [],

    // B
    primaryChannel: '', hasAssistant: 'no', assistantName: '', assistantContact: '',
    updateStyle: '', callWindows: [], language: LANGS[0],

    // C
    topGoals: [], timelines: '', successDefinition: '',

    // D
    occupation: '', sleepHours: '', sleepIssues: [], activity: '', exerciseDays: '',
    diet: '', dietChips: [], alcohol: '', tobacco: '', caffeineCups: '',

    // E
    travelFreq: '', travelZones: [], nextTripStart: '', nextTripEnd: '', jetLagHard: 'no',

    // F
    conditions: CONDITIONS.map(c => ({ ...c })), specialistCare: 'no', specialistWhich: '',

    // G
    rx: [{ name: '', dose: '', frequency: '', startDate: '' }],
    otc: [{ name: '', dose: '', frequency: '', startDate: '' }],
    adherence: '', sideEffects: '',

    // H
    drugAllergies: [], drugAllergiesFree: '',
    foodAllergies: [], foodAllergiesFree: '',
    otherAllergies: '',

    // I
    hadSurgery: 'no', surgeries: [{ title: '', monthYear: '', hospital: '', notes: '' }],

    // J
    famHeartEarly: 'unknown', famStroke: 'unknown', famDiabetes: 'unknown',
    famCancerTypes: [], famOther: '',

    // K
    bpSys: '', bpDia: '', bpDate: '', rhr: '', waistCm: '',
    wearable: '', wearableConnected: 'no',

    // L
    hasLabs: 'no', labUploads: [], lipidDate: '', ldl: '', lastA1c: '',
    perfTests: { date: '', uploads: [] },
    cancerScreening: '', recentImaging: 'no', imagingType: '', imagingUploads: [],

    // M
    painIssues: [], painFreeText: '', ptHistory: 'no', ptDetails: '',

    // N
    timePerWeekHours: '5', gymAccess: 'no', gymEquipment: '', hiitContra: 'no', hiitDetails: '', pregnancy: '',

    // O
    miscUploads: [], anythingElse: '',
  }));

  // Auth-guard
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

  /** ---------- Helpers ---------- */
  const db = useMemo(() => getFirestoreDB(), []);
  const storage = useMemo(() => getFirebaseStorage(), []);

  function set<K extends keyof Form>(key: K, val: Form[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function uploadFiles(folder: string, files: File[]): Promise<UploadedFile[]> {
    const out: UploadedFile[] = [];
    for (const f of files) {
      const path = `${folder}/${Date.now()}_${sanitizeFileName(f.name)}`;
      const r = ref(storage, path);
      const snap = await uploadBytes(r, f);
      const url = await getDownloadURL(snap.ref);
      out.push({ name: f.name, url, path });
    }
    return out;
  }

  function sanitizeFileName(n: string) {
    return n.replace(/[^\w\.\-]+/g, '_').slice(0, 120);
  }

  /** ---------- Submit ---------- */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setOk(null);
    if (!uid) return;

    setBusy(true);
    try {
      const target = doc(db, 'users', uid);

      // Coerce numeric strings on save (keep free typing as strings in UI)
      const payload = {
        medicalProfile: {
          ...form,
          heightCm: form.heightCm ? Number(form.heightCm) : null,
          weightKg: form.weightKg ? Number(form.weightKg) : null,
          sleepHours: form.sleepHours ? Number(form.sleepHours) : null,
          exerciseDays: form.exerciseDays ? Number(form.exerciseDays) : null,
          caffeineCups: form.caffeineCups ? Number(form.caffeineCups) : null,
          timePerWeekHours: form.timePerWeekHours ? Number(form.timePerWeekHours) : 5,
          updatedAt: serverTimestamp(),
        },
      };

      await setDoc(target, payload, { merge: true });
      setOk('Saved! Redirecting…');
      setTimeout(() => router.replace('/'), 900);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  /** ---------- UI helpers ---------- */
  function ChipBox({
    options, values, onToggle, placeholder,
  }: { options: string[]; values: string[]; onToggle: (v: string) => void; placeholder?: string }) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            style={{
              padding: '6px 10px', borderRadius: 9999,
              border: values.includes(o) ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.25)',
              background: values.includes(o) ? 'rgba(34,197,94,0.15)' : 'transparent',
              color: '#e2e8f0', cursor: 'pointer'
            }}
          >
            {o}
          </button>
        ))}
        {placeholder && values.length === 0 && <span style={{ color: '#94a3b8' }}>{placeholder}</span>}
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section style={styles.section}>
        <h2 style={styles.h2}>{title}</h2>
        <div style={{ display: 'grid', gap: 12 }}>{children}</div>
      </section>
    );
  }

  /** ---------- Render ---------- */
  return (
    <main style={styles.wrap}>
      <form onSubmit={handleSubmit} style={styles.card} autoComplete="off">
        <h1 style={styles.h1}>Medical Onboarding</h1>

        {/* A. Profile & Consent */}
        <Section title="A. Profile & Consent">
          <Row>
            <Field label="Full name">
              <input
                style={styles.input}
                value={form.fullName ?? ''}
                onChange={e => set('fullName', e.target.value)}
              />
            </Field>
            <Field label="Date of birth">
              <input
                style={styles.input}
                type="date"
                value={form.dob ?? ''}
                onChange={e => set('dob', e.target.value)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Biological sex">
              <RadioGroup
                value={form.biologicalSex ?? ''}
                options={['Male','Female','Intersex','Prefer not to say']}
                onChange={v => set('biologicalSex', v as any)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Height (cm)">
              <input
                style={styles.input}
                type="number"
                min={1}
                placeholder="cm"
                value={form.heightCm ?? ''}
                onChange={e => set('heightCm', e.target.value)}
              />
              <small style={styles.help}>Enter in centimeters (cm)</small>
            </Field>
            <Field label="Weight (kg)">
              <input
                style={styles.input}
                type="number"
                min={1}
                placeholder="kg"
                value={form.weightKg ?? ''}
                onChange={e => set('weightKg', e.target.value)}
              />
              <small style={styles.help}>Enter in kilograms (kg)</small>
            </Field>
          </Row>

          <Row>
            <Field label="Primary timezone">
              <select
                style={styles.input}
                value={form.timezone ?? ''}
                onChange={e => set('timezone', e.target.value)}
              >
                <option value="Asia/Singapore">Asia/Singapore</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </Field>
            <Field label="Primary city/country">
              <input
                style={styles.input}
                placeholder="e.g., Singapore, SG"
                value={form.cityCountry ?? ''}
                onChange={e => set('cityCountry', e.target.value)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Emergency contact name">
              <input
                style={styles.input}
                value={form.emergencyContactName ?? ''}
                onChange={e => set('emergencyContactName', e.target.value)}
              />
            </Field>
            <Field label="Emergency contact phone">
              <input
                style={styles.input}
                type="tel"
                value={form.emergencyContactPhone ?? ''}
                onChange={e => set('emergencyContactPhone', e.target.value)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Upload your ID (optional)">
              <FileUploader
                multiple
                onUpload={async (files) => {
                  const uploaded = await uploadFiles(`users/${uid}/id`, files);
                  set('idUploads', [...form.idUploads, ...uploaded]);
                }}
              />
              {form.idUploads.length > 0 && <FileList items={form.idUploads} />}
            </Field>
          </Row>

          <Row>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!form.consentStore}
                onChange={e => set('consentStore', e.target.checked)}
              />
              <span>Do you consent to us storing and processing your health data for this program?</span>
            </label>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!form.consentShare}
                onChange={e => set('consentShare', e.target.checked)}
              />
              <span>Share data with care team via WhatsApp/email?</span>
            </label>
          </Row>
        </Section>

        {/* B. Communication */}
        <Section title="B. Communication & Preferences">
          <Row>
            <Field label="Primary communication channel">
              <select
                style={styles.input}
                value={form.primaryChannel ?? ''}
                onChange={e => set('primaryChannel', e.target.value as any)}
              >
                <option value="">Select…</option>
                <option>WhatsApp</option>
                <option>Email</option>
                <option>SMS</option>
                <option>In-app</option>
              </select>
            </Field>
            <Field label="Do you have a PA/assistant?">
              <RadioYN value={form.hasAssistant} onChange={v => set('hasAssistant', v)} />
              {form.hasAssistant === 'yes' && (
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <input
                    style={styles.input}
                    placeholder="Assistant name"
                    value={form.assistantName ?? ''}
                    onChange={(e) => set('assistantName', e.target.value)}
                  />
                  <input
                    style={styles.input}
                    placeholder="Assistant phone/email"
                    value={form.assistantContact ?? ''}
                    onChange={(e) => set('assistantContact', e.target.value)}
                  />
                </div>
              )}
            </Field>
          </Row>

          <Row>
            <Field label="Update style">
              <RadioGroup
                value={form.updateStyle ?? ''}
                options={['Executive summary first','Detailed first']}
                onChange={v => set('updateStyle', v as any)}
              />
            </Field>
            <Field label="Language preference">
              <select
                style={styles.input}
                value={form.language ?? ''}
                onChange={e => set('language', e.target.value)}
              >
                {LANGS.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="Best days & time windows for calls (type and press Enter)">
            <TagInput
              values={form.callWindows}
              setValues={(vals) => set('callWindows', vals)}
              placeholder="e.g., Mon 9–11am; Thu 6–8pm"
            />
          </Field>
        </Section>

        {/* C. Goals */}
        <Section title="C. Goals">
          <Field label="Top 3 goals">
            <ChipBox
              options={GOALS}
              values={form.topGoals}
              onToggle={(v) => {
                const exists = form.topGoals.includes(v);
                const next = exists ? form.topGoals.filter(x => x !== v) : [...form.topGoals, v];
                set('topGoals', next.slice(0, 3)); // limit to 3
              }}
              placeholder="Pick up to 3"
            />
          </Field>
          <Row>
            <Field label="Target timeline(s)">
              <input
                style={styles.input}
                placeholder='e.g., "by Dec 2026"'
                value={form.timelines ?? ''}
                onChange={e => set('timelines', e.target.value)}
              />
            </Field>
            <Field label='What does “success” look like for you?'>
              <input
                style={styles.input}
                placeholder="Short text"
                value={form.successDefinition ?? ''}
                onChange={e => set('successDefinition', e.target.value)}
              />
            </Field>
          </Row>
        </Section>

        {/* D. Lifestyle */}
        <Section title="D. Lifestyle">
          <Row>
            <Field label="Occupation & typical work hours">
              <input
                style={styles.input}
                value={form.occupation ?? ''}
                onChange={e => set('occupation', e.target.value)}
              />
            </Field>
            <Field label="Average sleep duration (hours/night)">
              <input
                style={styles.input}
                type="number"
                min={0}
                step="0.5"
                value={form.sleepHours ?? ''}
                onChange={e => set('sleepHours', e.target.value)}
              />
              <small style={styles.help}>hours/night</small>
            </Field>
          </Row>

          <Field label="Sleep quality issues">
            <CheckboxGroup
              options={SLEEP_ISSUES}
              values={form.sleepIssues}
              onToggle={(v) => toggleInArray('sleepIssues', v)}
            />
          </Field>

          <Row>
            <Field label="Physical activity baseline">
              <RadioGroup
                value={form.activity ?? ''}
                options={['Sedentary','Light','Moderate','High']}
                onChange={(v) => set('activity', v as any)}
              />
            </Field>
            <Field label="Weekly exercise days you can commit (0–7)">
              <input
                style={styles.input}
                type="number"
                min={0}
                max={7}
                value={form.exerciseDays ?? ''}
                onChange={e => set('exerciseDays', e.target.value)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Diet pattern">
              <select
                style={styles.input}
                value={form.diet ?? ''}
                onChange={e => set('diet', e.target.value as any)}
              >
                <option value="">Select…</option>
                <option>Mixed</option><option>Vegetarian</option><option>Vegan</option>
                <option>Mediterranean</option><option>Low-carb</option><option>Other</option>
              </select>
            </Field>
            <Field label="Dietary preferences/restrictions (chips)">
              <ChipBox
                options={DIET_TAGS}
                values={form.dietChips}
                onToggle={(v) => toggleInArray('dietChips', v)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Alcohol use">
              <RadioGroup value={form.alcohol ?? ''} options={['None','Occasional','Weekly','Daily']} onChange={(v) => set('alcohol', v as any)} />
            </Field>
            <Field label="Tobacco use">
              <RadioGroup value={form.tobacco ?? ''} options={['Never','Former','Current']} onChange={(v) => set('tobacco', v as any)} />
            </Field>
            <Field label="Caffeine cups/day">
              <input
                style={styles.input}
                type="number"
                min={0}
                value={form.caffeineCups ?? ''}
                onChange={e => set('caffeineCups', e.target.value)}
              />
            </Field>
          </Row>
        </Section>

        {/* E. Travel */}
        <Section title="E. Travel Pattern">
          <Field label="How often do you travel for work?">
            <RadioGroup
              value={form.travelFreq ?? ''}
              options={['~1 week per month','2–3 days monthly','Rare']}
              onChange={(v) => set('travelFreq', v as any)}
            />
          </Field>

          <Field label="Typical destinations/time zones (chips)">
            <ChipBox
              options={TRAVEL_ZONE_SUGGESTIONS}
              values={form.travelZones}
              onToggle={(v) => toggleInArray('travelZones', v)}
            />
          </Field>

          <Row>
            <Field label="Next planned trip start">
              <input
                style={styles.input}
                type="date"
                value={form.nextTripStart ?? ''}
                onChange={e => set('nextTripStart', e.target.value)}
              />
            </Field>
            <Field label="Next planned trip end">
              <input
                style={styles.input}
                type="date"
                value={form.nextTripEnd ?? ''}
                onChange={e => set('nextTripEnd', e.target.value)}
              />
            </Field>
            <Field label="Jet lag hits you hard?">
              <RadioYN value={form.jetLagHard} onChange={(v) => set('jetLagHard', v)} />
            </Field>
          </Row>
        </Section>

        {/* F. Conditions */}
        <Section title="F. Medical Conditions">
          <div style={{ display:'grid', gap:8 }}>
            {form.conditions.map((c, idx) => (
              <div key={c.key} style={styles.condRow}>
                <label style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input
                    type="checkbox"
                    checked={!!c.selected}
                    onChange={e => {
                      const copy = [...form.conditions]; copy[idx] = { ...c, selected: e.target.checked };
                      set('conditions', copy);
                    }}
                  />
                  <span>{c.label}</span>
                </label>
                <input
                  style={styles.input}
                  placeholder="Year of diagnosis (if selected)"
                  type="number"
                  value={c.year ?? ''}
                  onChange={e => {
                    const copy = [...form.conditions]; copy[idx] = { ...c, year: e.target.value };
                    set('conditions', copy);
                  }}
                />
              </div>
            ))}
          </div>

          <Row>
            <Field label="Currently under any specialist care?">
              <RadioYN value={form.specialistCare} onChange={(v) => set('specialistCare', v)} />
              {form.specialistCare === 'yes' && (
                <input
                  style={{ ...styles.input, marginTop:8 }}
                  placeholder="Which specialist(s)?"
                  value={form.specialistWhich ?? ''}
                  onChange={e => set('specialistWhich', e.target.value)}
                />
              )}
            </Field>
          </Row>
        </Section>

        {/* G. Medications */}
        <Section title="G. Medications & Supplements">
          <h3 style={styles.h3}>Current prescription medications</h3>
          {form.rx.map((r, i) => (
            <Row key={`rx-${i}`}>
              <input style={styles.input} placeholder="Name" value={r.name ?? ''} onChange={e => updateRow('rx', i, { name: e.target.value })} />
              <input style={styles.input} placeholder="Dose" value={r.dose ?? ''} onChange={e => updateRow('rx', i, { dose: e.target.value })} />
              <input style={styles.input} placeholder="Frequency" value={r.frequency ?? ''} onChange={e => updateRow('rx', i, { frequency: e.target.value })} />
              <input style={styles.input} type="date" placeholder="Start date" value={r.startDate ?? ''} onChange={e => updateRow('rx', i, { startDate: e.target.value })} />
              <button type="button" onClick={() => removeRow('rx', i)} style={styles.smallBtn}>Remove</button>
            </Row>
          ))}
          <button type="button" onClick={() => addRow('rx')} style={styles.ghostBtn}>+ Add medication</button>

          <h3 style={styles.h3}>OTC meds / Supplements</h3>
          {form.otc.map((r, i) => (
            <Row key={`otc-${i}`}>
              <input style={styles.input} placeholder="Name" value={r.name ?? ''} onChange={e => updateRow('otc', i, { name: e.target.value })} />
              <input style={styles.input} placeholder="Dose" value={r.dose ?? ''} onChange={e => updateRow('otc', i, { dose: e.target.value })} />
              <input style={styles.input} placeholder="Frequency" value={r.frequency ?? ''} onChange={e => updateRow('otc', i, { frequency: e.target.value })} />
              <input style={styles.input} type="date" placeholder="Start date" value={r.startDate ?? ''} onChange={e => updateRow('otc', i, { startDate: e.target.value })} />
              <button type="button" onClick={() => removeRow('otc', i)} style={styles.smallBtn}>Remove</button>
            </Row>
          ))}
          <button type="button" onClick={() => addRow('otc')} style={styles.ghostBtn}>+ Add OTC/supplement</button>

          <Row>
            <Field label="Medication adherence">
              <RadioGroup value={form.adherence ?? ''} options={['Always','Often','Sometimes','Rarely']} onChange={(v) => set('adherence', v as any)} />
            </Field>
          </Row>
          <Field label="Any side effects you’re experiencing?">
            <textarea style={styles.textarea} value={form.sideEffects ?? ''} onChange={e => set('sideEffects', e.target.value)} />
          </Field>
        </Section>

        {/* H. Allergies */}
        <Section title="H. Allergies & Intolerances">
          <Field label="Drug allergies (pick & add details)">
            <CheckboxGroup options={DRUG_ALLERGY_LIST} values={form.drugAllergies} onToggle={(v) => toggleInArray('drugAllergies', v)} />
            <input style={{ ...styles.input, marginTop:8 }} placeholder="Free text details" value={form.drugAllergiesFree ?? ''} onChange={e => set('drugAllergiesFree', e.target.value)} />
          </Field>
          <Field label="Food allergies / intolerances">
            <CheckboxGroup options={FOOD_ALLERGY_LIST} values={form.foodAllergies} onToggle={(v) => toggleInArray('foodAllergies', v)} />
            <input style={{ ...styles.input, marginTop:8 }} placeholder="Free text details" value={form.foodAllergiesFree ?? ''} onChange={e => set('foodAllergiesFree', e.target.value)} />
          </Field>
          <Field label="Other allergies">
            <textarea style={styles.textarea} value={form.otherAllergies ?? ''} onChange={e => set('otherAllergies', e.target.value)} />
          </Field>
        </Section>

        {/* I. Surgeries/Hospitalizations */}
        <Section title="I. Past Surgeries / Hospitalizations">
          <Row>
            <Field label="Have you had surgery/hospitalization?">
              <RadioYN value={form.hadSurgery} onChange={(v) => set('hadSurgery', v)} />
            </Field>
          </Row>
          {form.hadSurgery === 'yes' && (
            <>
              {form.surgeries.map((s, i) => (
                <Row key={`sx-${i}`}>
                  <input style={styles.input} placeholder="Procedure/diagnosis" value={s.title ?? ''} onChange={e => updateSx(i, { title: e.target.value })} />
                  <input style={styles.input} placeholder="Month/Year" value={s.monthYear ?? ''} onChange={e => updateSx(i, { monthYear: e.target.value })} />
                  <input style={styles.input} placeholder="Hospital" value={s.hospital ?? ''} onChange={e => updateSx(i, { hospital: e.target.value })} />
                  <input style={styles.input} placeholder="Notes" value={s.notes ?? ''} onChange={e => updateSx(i, { notes: e.target.value })} />
                  <button type="button" onClick={() => removeSx(i)} style={styles.smallBtn}>Remove</button>
                </Row>
              ))}
              <button type="button" onClick={() => addSx()} style={styles.ghostBtn}>+ Add surgery/hospitalization</button>
            </>
          )}
        </Section>

        {/* J. Family History */}
        <Section title="J. Family History (first-degree)">
          <Row>
            <Field label="Heart disease <55 (men) / <65 (women)">
              <Radio3 value={form.famHeartEarly} onChange={v => set('famHeartEarly', v)} />
            </Field>
            <Field label="Stroke">
              <Radio3 value={form.famStroke} onChange={v => set('famStroke', v)} />
            </Field>
            <Field label="Diabetes">
              <Radio3 value={form.famDiabetes} onChange={v => set('famDiabetes', v)} />
            </Field>
          </Row>
          <Field label="Cancer (type) — chips">
            <TagInput values={form.famCancerTypes} setValues={(vals) => set('famCancerTypes', vals)} placeholder="e.g., Breast, Colon" />
          </Field>
          <Field label="Other hereditary conditions">
            <textarea style={styles.textarea} value={form.famOther ?? ''} onChange={e => set('famOther', e.target.value)} />
          </Field>
        </Section>

        {/* K. Measurements & Devices */}
        <Section title="K. Measurements & Devices">
          <Row>
            <Field label="Blood pressure — systolic">
              <input style={styles.input} type="number" placeholder="systolic" value={form.bpSys ?? ''} onChange={e => set('bpSys', e.target.value)} />
              <small style={styles.help}>mmHg</small>
            </Field>
            <Field label="Blood pressure — diastolic">
              <input style={styles.input} type="number" placeholder="diastolic" value={form.bpDia ?? ''} onChange={e => set('bpDia', e.target.value)} />
              <small style={styles.help}>mmHg</small>
            </Field>
            <Field label="BP date">
              <input style={styles.input} type="date" value={form.bpDate ?? ''} onChange={e => set('bpDate', e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="Resting heart rate">
              <input style={styles.input} type="number" value={form.rhr ?? ''} onChange={e => set('rhr', e.target.value)} />
              <small style={styles.help}>bpm</small>
            </Field>
            <Field label="Waist circumference">
              <input style={styles.input} type="number" value={form.waistCm ?? ''} onChange={e => set('waistCm', e.target.value)} />
              <small style={styles.help}>cm</small>
            </Field>
          </Row>

          <Row>
            <Field label="Wearables connected?">
              <select style={styles.input} value={form.wearable ?? ''} onChange={e => set('wearable', e.target.value as any)}>
                <option value="">Select…</option>
                <option>Garmin</option><option>Apple Watch</option><option>Fitbit</option><option>Oura</option><option>None</option>
              </select>
            </Field>
            <Field label="If yes: connect wearable (manual step)">
              <RadioYN value={form.wearableConnected} onChange={v => set('wearableConnected', v)} />
            </Field>
          </Row>
        </Section>

        {/* L. Recent Tests / Screenings */}
        <Section title="L. Recent Tests / Screenings">
          <Row>
            <Field label="Recent lab results available?">
              <RadioYN value={form.hasLabs} onChange={v => set('hasLabs', v)} />
            </Field>
          </Row>
          {form.hasLabs === 'yes' && (
            <Field label="Upload lab PDFs/images">
              <FileUploader
                multiple
                onUpload={async (files) => {
                  const uploaded = await uploadFiles(`users/${uid}/labs`, files);
                  set('labUploads', [...form.labUploads, ...uploaded]);
                }}
              />
              {form.labUploads.length > 0 && <FileList items={form.labUploads} />}
            </Field>
          )}

          <Row>
            <Field label="Last lipid panel date">
              <input style={styles.input} type="date" value={form.lipidDate ?? ''} onChange={e => set('lipidDate', e.target.value)} />
            </Field>
            <Field label="LDL (if known)">
              <input style={styles.input} type="number" value={form.ldl ?? ''} onChange={e => set('ldl', e.target.value)} />
              <small style={styles.help}>mg/dL</small>
            </Field>
            <Field label="Last A1c (if known)">
              <input style={styles.input} type="number" step="0.1" value={form.lastA1c ?? ''} onChange={e => set('lastA1c', e.target.value)} />
              <small style={styles.help}>%</small>
            </Field>
          </Row>

          <Field label="DEXA / VO₂max / ECG / Stress test (date + upload)">
            <div style={{ display:'grid', gap:8 }}>
              <input style={styles.input} type="date" value={form.perfTests.date ?? ''} onChange={e => set('perfTests', { ...form.perfTests, date: e.target.value })} />
              <FileUploader
                multiple
                onUpload={async (files) => {
                  const uploaded = await uploadFiles(`users/${uid}/perfTests`, files);
                  set('perfTests', { ...form.perfTests, uploads: [...form.perfTests.uploads, ...uploaded] });
                }}
              />
              {form.perfTests.uploads.length > 0 && <FileList items={form.perfTests.uploads} />}
            </div>
          </Field>

          <Field label="Cancer screening done? (optional)">
            <input style={styles.input} placeholder="colonoscopy/mammogram/PSA…" value={form.cancerScreening ?? ''} onChange={e => set('cancerScreening', e.target.value)} />
          </Field>

          <Row>
            <Field label="Any imaging (CT/MRI/US) in last 2 years?">
              <RadioYN value={form.recentImaging} onChange={v => set('recentImaging', v)} />
            </Field>
            {form.recentImaging === 'yes' && (
              <>
                <Field label="Type">
                  <input style={styles.input} placeholder="e.g., MRI brain" value={form.imagingType ?? ''} onChange={e => set('imagingType', e.target.value)} />
                </Field>
                <Field label="Upload imaging reports">
                  <FileUploader
                    multiple
                    onUpload={async (files) => {
                      const uploaded = await uploadFiles(`users/${uid}/imaging`, files);
                      set('imagingUploads', [...form.imagingUploads, ...uploaded]);
                    }}
                  />
                  {form.imagingUploads.length > 0 && <FileList items={form.imagingUploads} />}
                </Field>
              </>
            )}
          </Row>
        </Section>

        {/* M. Pain / PT */}
        <Section title="M. Pain / Injuries / PT">
          <Field label="Current pain or limitations">
            <CheckboxGroup options={PAIN_LIST} values={form.painIssues} onToggle={(v) => toggleInArray('painIssues', v)} />
            <textarea style={{ ...styles.textarea, marginTop:8 }} placeholder="Free text" value={form.painFreeText ?? ''} onChange={e => set('painFreeText', e.target.value)} />
          </Field>
          <Row>
            <Field label="PT history">
              <RadioYN value={form.ptHistory} onChange={v => set('ptHistory', v)} />
            </Field>
            {form.ptHistory === 'yes' && (
              <Field label="Details">
                <input style={styles.input} value={form.ptDetails ?? ''} onChange={e => set('ptDetails', e.target.value)} />
              </Field>
            )}
          </Row>
        </Section>

        {/* N. Constraints & Risks */}
        <Section title="N. Constraints & Risks">
          <Row>
            <Field label="Time available per week for the plan">
              <input style={styles.input} type="number" min={1} value={form.timePerWeekHours ?? ''} onChange={e => set('timePerWeekHours', e.target.value)} />
              <small style={styles.help}>hours (default 5)</small>
            </Field>
            <Field label="Gym access">
              <RadioYN value={form.gymAccess} onChange={v => set('gymAccess', v)} />
            </Field>
            {form.gymAccess === 'yes' && (
              <Field label="Equipment">
                <input style={styles.input} placeholder="e.g., squat rack, treadmill" value={form.gymEquipment ?? ''} onChange={e => set('gymEquipment', e.target.value)} />
              </Field>
            )}
          </Row>

          <Row>
            <Field label="Contraindications for high-intensity exercise">
              <RadioYN value={form.hiitContra} onChange={v => set('hiitContra', v)} />
            </Field>
            {form.hiitContra === 'yes' && (
              <Field label="Details">
                <input style={styles.input} value={form.hiitDetails ?? ''} onChange={e => set('hiitDetails', e.target.value)} />
              </Field>
            )}
            <Field label="Pregnancy / planning pregnancy in next 12 months (optional)">
              <select style={styles.input} value={form.pregnancy ?? ''} onChange={e => set('pregnancy', e.target.value as any)}>
                <option value="">Prefer not to say</option>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </Field>
          </Row>
        </Section>

        {/* O. Documents */}
        <Section title="O. Documents">
          <Field label="Upload medical reports (PDFs/images)">
            <FileUploader
              multiple
              onUpload={async (files) => {
                const uploaded = await uploadFiles(`users/${uid}/docs`, files);
                set('miscUploads', [...form.miscUploads, ...uploaded]);
              }}
            />
            {form.miscUploads.length > 0 && <FileList items={form.miscUploads} />}
          </Field>

          <Field label="Anything else we should know?">
            <textarea style={styles.textarea} value={form.anythingElse ?? ''} onChange={e => set('anythingElse', e.target.value)} />
          </Field>
        </Section>

        {err && <div style={styles.error}>{err}</div>}
        {ok && <div style={styles.ok}>{ok}</div>}

        <button type="submit" style={styles.primaryBtn} disabled={busy || !uid}>
          {busy ? 'Saving…' : 'Save & Continue to Home'}
        </button>
      </form>
    </main>
  );

  /** ----- Inline helpers for arrays ----- */
  function toggleInArray<K extends keyof Form>(key: K, val: string) {
    const arr = (form[key] as string[]) ?? [];
    const next = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
    set(key, next as any);
  }
  function addRow(key: 'rx' | 'otc') {
    const blank: RxRow = { name: '', dose: '', frequency: '', startDate: '' };
    set(key, ([...(form as any)[key], blank]) as any);
  }
  function removeRow(key: 'rx' | 'otc', idx: number) {
    const next = [...(form as any)[key]]; next.splice(idx, 1);
    if (next.length === 0) next.push({ name: '', dose: '', frequency: '', startDate: '' });
    set(key, next as any);
  }
  function updateRow(key: 'rx' | 'otc', idx: number, patch: Partial<RxRow>) {
    const next = [...(form as any)[key]];
    next[idx] = { ...next[idx], ...patch };
    set(key, next as any);
  }
  function addSx() {
    set('surgeries', [...form.surgeries, { title:'', monthYear:'', hospital:'', notes:'' }]);
  }
  function removeSx(i: number) {
    const next = [...form.surgeries]; next.splice(i,1);
    if (next.length === 0) next.push({ title:'', monthYear:'', hospital:'', notes:'' });
    set('surgeries', next);
  }
  function updateSx(i: number, patch: Partial<SurgeryRow>) {
    const next = [...form.surgeries]; next[i] = { ...next[i], ...patch }; set('surgeries', next);
  }

  /** ----- Small subcomponents ----- */
  function Row({ children }: { children: React.ReactNode }) {
    return <div style={styles.row}>{children}</div>;
  }
  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={{ display: 'grid', gap: 6, flex: 1 }}>
        <label style={styles.label}>{label}</label>
        {children}
      </div>
    );
  }

  // Stable-name radio group (prevents remounting & input glitches)
  function RadioGroup({
    value, options, onChange
  }: { value: string; options: string[]; onChange:(v:string)=>void }) {
    const name = useId();
    return (
      <div style={styles.radioRow}>
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
  function RadioYN({ value, onChange }: { value: YesNo; onChange:(v:YesNo)=>void }) {
    return <RadioGroup value={value} options={['yes','no']} onChange={(v)=>onChange(v as YesNo)} />;
  }
  function Radio3({ value, onChange }: { value: Radio3; onChange:(v:Radio3)=>void }) {
    return <RadioGroup value={value} options={['yes','no','unknown']} onChange={(v)=>onChange(v as Radio3)} />;
  }
  function CheckboxGroup({ options, values, onToggle }:{ options:string[]; values:string[]; onToggle:(v:string)=>void }) {
    return (
      <div style={styles.checkboxGroup}>
        {options.map(o => (
          <label key={o} style={styles.checkboxItem}>
            <input type="checkbox" checked={values.includes(o)} onChange={() => onToggle(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    );
  }
  function TagInput({ values, setValues, placeholder }: { values:string[]; setValues:(v:string[])=>void; placeholder?:string }) {
    const [input, setInput] = useState('');
    return (
      <div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
          {values.map(v => (
            <span key={v} style={styles.tag}>
              {v}
              <button type="button" onClick={()=>setValues(values.filter(x=>x!==v))} style={styles.tagX}>×</button>
            </span>
          ))}
        </div>
        <input
          style={styles.input}
          placeholder={placeholder || 'Type and press Enter'}
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          onKeyDown={(e)=>{
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault();
              if (!values.includes(input.trim())) setValues([...values, input.trim()]);
              setInput('');
            }
          }}
        />
      </div>
    );
  }
  function FileUploader({ multiple, onUpload }:{ multiple?:boolean; onUpload:(files:File[])=>void|Promise<void> }) {
    return (
      <input
        style={styles.input}
        type="file"
        multiple={multiple}
        onChange={(e)=> {
          const files = Array.from(e.target.files || []);
          if (files.length) onUpload(files);
        }}
      />
    );
  }
  function FileList({ items }:{ items:UploadedFile[] }) {
    return (
      <ul style={{ marginTop:8, display:'grid', gap:6, paddingLeft:18 }}>
        {items.map((f,i)=>(
          <li key={i}><a href={f.url} target="_blank" rel="noreferrer" style={styles.link}>{f.name}</a></li>
        ))}
      </ul>
    );
  }
}

/** ---------- Styles ---------- */
const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight:'100vh', display:'grid', placeItems:'center', background:'linear-gradient(135deg,#0f172a,#1e293b)', color:'#e2e8f0', padding:16 },
  card: { width:'100%', maxWidth:1000, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:24, boxShadow:'0 8px 30px rgba(0,0,0,0.3)' },
  h1: { marginTop:0, marginBottom:8, fontSize:'1.8rem', fontWeight:800 },
  h2: { margin:'8px 0', fontSize:'1.2rem', fontWeight:700, background:'linear-gradient(to right,#22c55e,#38bdf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' } as any,
  h3: { margin:'10px 0 6px', fontWeight:700 },
  section: { marginTop:12, paddingTop:8, borderTop:'1px dashed rgba(255,255,255,0.15)' },
  row: { display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))' },
  input: { padding:'10px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.05)', color:'#e2e8f0' },
  textarea: { padding:'10px 12px', minHeight:72, borderRadius:8, border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.05)', color:'#e2e8f0' },
  label: { fontSize:12, color:'#9ca3af' },
  help: { color:'#94a3b8', fontSize:12 },
  checkboxRow: { display:'flex', gap:8, alignItems:'center' },
  checkboxGroup: { display:'flex', flexWrap:'wrap', gap:10 },
  checkboxItem: { display:'flex', gap:8, alignItems:'center' },
  radioRow: { display:'flex', flexWrap:'wrap', gap:12 },
  radioLabel: { display:'flex', gap:8, alignItems:'center' },
  primaryBtn: { marginTop:12, padding:'12px 16px', background:'linear-gradient(90deg,#22c55e,#38bdf8)', color:'#0f172a', fontWeight:800, borderRadius:10, border:'none', cursor:'pointer' },
  error: { marginTop:10, background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.35)', color:'#fecaca', padding:'8px 10px', borderRadius:8 },
  ok: { marginTop:10, background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.35)', color:'#bbf7d0', padding:'8px 10px', borderRadius:8 },
  link: { color:'#93c5fd', textDecoration:'underline' },
  ghostBtn: { padding:'8px 10px', border:'1px solid rgba(255,255,255,0.25)', background:'transparent', color:'#e2e8f0', borderRadius:8, cursor:'pointer' },
  smallBtn: { padding:'6px 8px', border:'1px solid rgba(255,255,255,0.25)', background:'transparent', color:'#e2e8f0', borderRadius:8, cursor:'pointer', height:40 },
  tag: { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:9999, border:'1px solid rgba(255,255,255,0.25)' },
  tagX: { background:'transparent', color:'#e2e8f0', border:'none', cursor:'pointer' },
};
