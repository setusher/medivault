'use client';
import { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';





type Result = {
  prediction?: string;
  confidence?: number;
  probabilities?: number[] | Record<string, number>;
  error?: string;
};

export default function UploadScans() {
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<string>('pneumonia'); // default
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const auth = await getFirebaseAuth();
      onAuthStateChanged(auth, (u) => { if (!u) window.location.href = '/auth'; });
    })();
  }, []);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f); setResult(null); setErr(null);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  // create a nicer filename label
  const fileLabel = useMemo(() => file?.name ?? 'No file selected', [file]);

  const analyze = async () => {
    if (!file) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('model', model); // covid | pneumonia | tb | lung | alz

      const r = await fetch('/api/scans/analyze', { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) setErr(data.error || 'Analysis failed');
      else setResult(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    
    <main style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Upload your scans</h1>
        <p style={styles.subtitle}>
          Select a model and upload a JPG/PNG scan. We’ll run it through the analyzer and show the prediction.
        </p>

        <div style={styles.controls}>
          {/* Model select */}
          <label style={styles.label}>Select model</label>
          <select value={model} onChange={(e)=>setModel(e.target.value)} style={styles.select}>
            <option value="pneumonia">Pneumonia</option>
            <option value="tb">TB</option>
            <option value="lung">Lung Cancer</option>
            <option value="alz">Alzheimer’s</option>
            <option value="covid">COVID-19</option>
          </select>

          {/* File picker (customized) */}
          <label style={{...styles.label, marginTop: 20}}>Select image</label>
          <div style={styles.fileRow}>
            <input id="scan-file" type="file" accept="image/png,image/jpeg" onChange={pick} style={styles.fileInput} />
            <label htmlFor="scan-file" style={styles.fileButton}>
              Choose file
            </label>
            <span style={styles.fileName}>{fileLabel}</span>
          </div>
        </div>

        {preview && <img src={preview} alt="preview" style={styles.preview} />}

        <button onClick={analyze} disabled={!file || busy} style={styles.primaryBtn}>
          {busy ? 'Analyzing…' : 'Analyze'}
        </button>

        {err && <div style={styles.error}>{err}</div>}

        {result && !err && (
          <div style={styles.resultBox}>
            {'prediction' in result && <div style={styles.resultRow}><b>Prediction:</b> {result.prediction}</div>}
            {'confidence' in result && (
              <div style={styles.resultRow}><b>Confidence:</b> {(result.confidence! * 100).toFixed(1)}%</div>
            )}
            {'probabilities' in result && result.probabilities && (
              <>
                <div style={{ marginTop: 12, color: '#94a3b8', fontWeight: 600 }}>Probabilities</div>
                <pre style={styles.pre}>{JSON.stringify(result.probabilities, null, 2)}</pre>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 18 }}><a href="/" style={{ color: '#93c5fd', textDecoration: 'none' }}>← Back to Home</a></div>
      </div>
    </main>

  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(135deg,#0b1220,#152238)',
    color: '#e2e8f0',
    padding: 32, // increased page padding
  },
  card: {
    width: '100%',
    maxWidth: 860, // wider card
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 18,
    padding: 32, // increased card padding
    boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
  },
  title: { margin: 0, marginBottom: 10, fontSize: '1.9rem', fontWeight: 800 },
  subtitle: { color: '#a1aec6', marginTop: 0, marginBottom: 26, lineHeight: 1.6 },
  controls: { display: 'grid', gap: 14, marginBottom: 18 },
  label: { fontSize: 13, color: '#9fb2cc', fontWeight: 600, letterSpacing: 0.2 },
  select: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    outline: 'none',
  },

  // Custom file input styles
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16, // creates clear separation between button and filename
    flexWrap: 'wrap',
  },
  fileInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
    pointerEvents: 'none',
  },
  fileButton: {
    display: 'inline-block',
    padding: '12px 16px',
    borderRadius: 10,
    background: 'linear-gradient(90deg,#60a5fa,#34d399)', // highlighted button
    color: '#0b1220',
    fontWeight: 800,
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 6px 18px rgba(32,178,170,0.25)',
    userSelect: 'none',
  },
  fileName: {
    color: '#cbd5e1',
    minWidth: 200,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px dashed rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.04)',
  },

  preview: {
    marginTop: 22, // more space above preview
    maxWidth: '100%',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  primaryBtn: {
    marginTop: 22, // more space above button
    padding: '12px 16px',
    background: 'linear-gradient(90deg,#22c55e,#38bdf8)',
    color: '#0f172a',
    fontWeight: 900,
    fontSize: 16,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(34,197,94,0.25)',
  },
  error: {
    marginTop: 16,
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.35)',
    color: '#fecaca',
    padding: '12px 14px', // roomier
    borderRadius: 10,
  },
  resultBox: {
    marginTop: 16,
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.35)',
    color: '#dcfce7',
    padding: '12px 14px',
    borderRadius: 12,
  },
  resultRow: { marginTop: 4 },
  pre: {
    marginTop: 8,
    whiteSpace: 'pre-wrap',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 10,
    maxHeight: 280,
    overflow: 'auto',
  },
};
