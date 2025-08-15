'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, User } from 'firebase/auth';
import { googleProvider, getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';
import { addDoc, collection, getDocs } from 'firebase/firestore';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const auth = await getFirebaseAuth();

      // Handle redirect results if we fell back to redirect
      try { await getRedirectResult(auth); } catch (e: any) { console.warn(e); }

      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
      return () => unsub();
    })();
  }, []);

  async function handleGoogleSignIn() {
    setErr(null);
    const a = await getFirebaseAuth();
    console.log('Auth OK?', !!a, 'App name:', a.app.name);
    console.log('Provider ID:', googleProvider.providerId); // should be "google.com"
  
    try {
      await signInWithPopup(a, googleProvider);
    } catch (e: any) {
      console.error('Popup sign-in error:', e?.code, e?.message);
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(a, googleProvider);
        return;
      }
      setErr(`Sign-in failed: ${e?.code ?? 'unknown'}`);
    }
  }
  
  

  async function addNote() {
    const db = getFirestoreDB();
    await addDoc(collection(db, 'notes'), { text: `Hello at ${new Date().toISOString()}`, uid: user?.uid ?? null });
    await loadNotes();
  }

  async function loadNotes() {
    const db = getFirestoreDB();
    const snap = await getDocs(collection(db, 'notes'));
    setNotes(snap.docs.map((d) => (d.data().text as string)));
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <main style={{ padding: 24, display: 'grid', gap: 12 }}>
      <h1>Next.js + Firebase 🚀</h1>

      {user ? (
        <>
          <div>Signed in as <b>{user.displayName ?? user.email}</b></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addNote}>Add Note</button>
            <button onClick={loadNotes}>Load Notes</button>
          </div>
        </>
      ) : (
        <button onClick={handleGoogleSignIn}>Sign in with Google</button>
      )}

      {err && <div style={{ color: 'tomato' }}>{err}</div>}

      <h2>Notes</h2>
      <ul>{notes.map((n, i) => (<li key={i}>{n}</li>))}</ul>
    </main>
  );
}
