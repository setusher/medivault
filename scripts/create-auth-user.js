// Run with: node scripts/create-auth-user.js
const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function main() {
  const CUSTOM_UID = "rohan";            // <- your designed UID (must be unique)
  const EMAIL      = "rohan@example.com";
  const PASSWORD   = "StrongPassword!23";
  const NAME       = "Rohan";

  // Idempotent: try to get; create if missing
  let userRecord;
  try {
    userRecord = await admin.auth().getUser(CUSTOM_UID);
    console.log(`[Auth] User already exists: ${userRecord.uid}`);
  } catch {
    userRecord = await admin.auth().createUser({
      uid: CUSTOM_UID,                   // <-- THIS sets the actual Auth UID
      email: EMAIL,
      password: PASSWORD,
      displayName: NAME,
    });
    console.log(`[Auth] Created user: ${userRecord.uid}`);
  }

  // Create/merge a profile at /users/{uid}
  await db.collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    email: userRecord.email ?? null,
    displayName: userRecord.displayName ?? null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`[Firestore] Upserted /users/${userRecord.uid}`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
