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

  // UI-only hover/press state for lift transitions
  const [primaryHover, setPrimaryHover] = useState(false);
  const [primaryPressed, setPrimaryPressed] = useState(false);
  const [fileHover, setFileHover] = useState(false);
  const [filePressed, setFilePressed] = useState(false);

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

  // Palette
  const P = {
    mist: '#d8e2dc',
    blush: '#ffe5d9',
    petal: '#ffcad4',
    coral: '#f4acb7',
    mauve: '#9d8189',
  };

  // Common lift styles
  const lift = (hover: boolean, pressed: boolean, baseShadow: string, glowShadow: string) => ({
    transform: pressed ? 'translateY(-2px)' : hover ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: pressed ? `${glowShadow}, 0 10px 24px rgba(0,0,0,0.18)`
             : hover   ? `${glowShadow}, 0 8px 20px rgba(0,0,0,0.16)`
             : baseShadow,
    transition: 'transform 120ms ease, box-shadow 220ms ease, background 320ms ease, border-color 320ms ease',
  });

  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 32,
      color: P.mauve,
      // Soft pastel layered gradient background
      background: `linear-gradient(135deg, ${P.mist} 0%, ${P.blush} 35%, ${P.petal} 70%, ${P.coral} 100%)`,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 860,
        borderRadius: 18,
        padding: 32,
        // translucent card over pastel bg
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${P.mist}`,
        boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
      }}>
        <h1 style={{ margin: 0, marginBottom: 10, fontSize: '1.9rem', fontWeight: 800, color: P.mauve }}>
          Upload your scans
        </h1>
        <p style={{ color: '#5b4d53', marginTop: 0, marginBottom: 26, lineHeight: 1.6 }}>
          Select a model and upload a JPG/PNG scan. We’ll run it through the analyzer and show the prediction.
        </p>

        <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
          <label style={{ fontSize: 13, color: '#6b5a60', fontWeight: 700, letterSpacing: 0.2 }}>Select model</label>
          <select
            value={model}
            onChange={(e)=>setModel(e.target.value)}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: `1px solid ${P.petal}`,
              background: `linear-gradient(180deg, rgba(255,255,255,0.9), ${P.blush})`,
              color: '#3b3034',
              outline: 'none',
              boxShadow: `0 2px 10px rgba(0,0,0,0.06)`,
              transition: 'box-shadow 220ms ease, border-color 220ms ease',
            }}
            onFocus={(e)=>{ (e.currentTarget.style.borderColor = P.coral); (e.currentTarget.style.boxShadow = `0 6px 18px rgba(157,129,137,0.18)`) }}
            onBlur={(e)=>{ (e.currentTarget.style.borderColor = P.petal); (e.currentTarget.style.boxShadow = `0 2px 10px rgba(0,0,0,0.06)`) }}
          >
            <option value="pneumonia">Pneumonia</option>
            <option value="tb">TB</option>
            <option value="lung">Lung Cancer</option>
            <option value="alz">Alzheimer’s</option>
            <option value="covid">COVID-19</option>
          </select>

          <label style={{ fontSize: 13, color: '#6b5a60', fontWeight: 700, letterSpacing: 0.2, marginTop: 20 }}>
            Select image
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <input
              id="scan-file"
              type="file"
              accept="image/png,image/jpeg"
              onChange={pick}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            />
            <label
              htmlFor="scan-file"
              style={{
                display: 'inline-block',
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                userSelect: 'none',
                color: '#392f33',
                fontWeight: 800,
                // Gradient + glow
                background: `linear-gradient(90deg, ${P.petal}, ${P.coral})`,
                ...lift(fileHover, filePressed, '0 6px 18px rgba(0,0,0,0.08)', `0 0 0 6px rgba(255,202,212,0.35)`),
              }}
              onMouseEnter={()=>setFileHover(true)}
              onMouseLeave={()=>{ setFileHover(false); setFilePressed(false); }}
              onMouseDown={()=>setFilePressed(true)}
              onMouseUp={()=>setFilePressed(false)}
            >
              Choose file
            </label>
            <span style={{
              color: '#4a3f44',
              minWidth: 200,
              padding: '10px 12px',
              borderRadius: 12,
              border: `1px dashed ${P.petal}`,
              background: `linear-gradient(180deg, rgba(255,255,255,0.85), ${P.mist})`,
            }}>
              {fileLabel}
            </span>
          </div>
        </div>

        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{
              marginTop: 22,
              maxWidth: '100%',
              borderRadius: 16,
              border: `1px solid ${P.mist}`,
              boxShadow: '0 10px 26px rgba(0,0,0,0.12)',
            }}
          />
        )}

        <button
          onClick={analyze}
          disabled={!file || busy}
          style={{
            marginTop: 22,
            padding: '12px 16px',
            borderRadius: 14,
            border: 'none',
            cursor: (!file || busy) ? 'not-allowed' : 'pointer',
            fontWeight: 900,
            fontSize: 16,
            color: '#3b3034',
            // Button gradient & glow
            background: (!file || busy)
              ? `linear-gradient(90deg, ${P.mist}, ${P.blush})`
              : `linear-gradient(90deg, ${P.coral}, ${P.petal})`,
            opacity: (!file || busy) ? 0.7 : 1,
            ...lift(primaryHover, primaryPressed, '0 10px 24px rgba(0,0,0,0.12)', `0 0 0 8px rgba(244,172,183,0.35)`),
          }}
          onMouseEnter={()=>setPrimaryHover(true)}
          onMouseLeave={()=>{ setPrimaryHover(false); setPrimaryPressed(false); }}
          onMouseDown={()=>setPrimaryPressed(true)}
          onMouseUp={()=>setPrimaryPressed(false)}
        >
          {busy ? 'Analyzing…' : 'Analyze'}
        </button>

        {err && (
          <div style={{
            marginTop: 16,
            borderRadius: 12,
            padding: '12px 14px',
            color: '#6b2f3a',
            background: `linear-gradient(180deg, rgba(255,255,255,0.85), ${P.petal})`,
            border: `1px solid ${P.petal}`,
            boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
          }}>
            {err}
          </div>
        )}

        {result && !err && (
          <div style={{
            marginTop: 16,
            borderRadius: 14,
            padding: '14px 16px',
            color: '#2f2a2c',
            background: `linear-gradient(180deg, rgba(255,255,255,0.9), ${P.blush})`,
            border: `1px solid ${P.coral}`,
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
          }}>
            {'prediction' in result && (
              <div style={{ marginTop: 4 }}><b>Prediction:</b> {result.prediction}</div>
            )}
            {'confidence' in result && (
              <div style={{ marginTop: 4 }}>
                <b>Confidence:</b> {(result.confidence! * 100).toFixed(1)}%
              </div>
            )}
            {'probabilities' in result && result.probabilities && (
              <>
                <div style={{ marginTop: 12, color: '#5b4d53', fontWeight: 700 }}>Probabilities</div>
                <pre style={{
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                  background: `linear-gradient(180deg, rgba(255,255,255,0.85), ${P.mist})`,
                  border: `1px solid ${P.mist}`,
                  padding: 12,
                  borderRadius: 12,
                  maxHeight: 280,
                  overflow: 'auto',
                  color: '#3b3034',
                }}>
{JSON.stringify(result.probabilities, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <a href="/" style={{ color: P.mauve, textDecoration: 'none', fontWeight: 700 }}>
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
