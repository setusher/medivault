import { NextRequest, NextResponse } from 'next/server';

const ML_API = process.env.ML_API_URL!; // e.g. http://localhost:5500
export const runtime = 'nodejs';

// Map UI "model" to Flask endpoints in your app.py
const ENDPOINTS: Record<string, string> = {
  covid: '/predict_covid',
  pneumonia: '/predict_pneumonia',
  tb: '/predict_tb',
  lung: '/predict_lung',
  alz: '/predict_alz',
};

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 });
    }

    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const model = (fd.get('model') as string | null)?.toLowerCase() || '';

    if (!file) return NextResponse.json({ error: 'file missing' }, { status: 400 });
    if (!model || !(model in ENDPOINTS)) {
      return NextResponse.json({ error: 'invalid or missing model' }, { status: 400 });
    }

    // forward file to Flask
    const forward = new FormData();
    forward.append('file', file, (file as any).name ?? 'scan.jpg');

    const resp = await fetch(`${ML_API}${ENDPOINTS[model]}`, {
      method: 'POST',
      body: forward,
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 });
  }
}
