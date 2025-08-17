// 'use client';
// import { useSearchParams, useRouter } from 'next/navigation';
// import { doc, getDoc, updateDoc } from 'firebase/firestore';
// import { onAuthStateChanged } from 'firebase/auth';
// import { getFirebaseAuth, getFirestoreDB } from '@/lib/firebase';
// import { useEffect, useState } from 'react';

// export default function Claim() {
//   const sp = useSearchParams();
//   const memberId = sp.get('memberId'); // e.g. ?memberId=rohan
//   const [msg, setMsg] = useState('Checking…');
//   const router = useRouter();

//   useEffect(() => {
//     if (!memberId) { setMsg('Missing memberId'); return; }
//     (async () => {
//       const auth = await getFirebaseAuth();
//       const db = getFirestoreDB();
//       onAuthStateChanged(auth, async (u) => {
//         if (!u) { setMsg('Please sign in to claim.'); return; }
//         const ref = doc(db, 'users', memberId);
//         const snap = await getDoc(ref);
//         if (!snap.exists()) { setMsg('Member not found'); return; }

//         const data = snap.data() as any;
//         if (data.ownerUid && data.ownerUid !== u.uid) {
//           setMsg('This record is already linked to another account.');
//           return;
//         }
//         await updateDoc(ref, { ownerUid: u.uid });   // 🚩 Link it
//         setMsg('Linked! Redirecting…');
//         router.push(`/chats/${memberId}/01`);
//       });
//     })();
//   }, [memberId, router]);

//   return <div style={{ padding: 24 }}>{msg}</div>;
// }
