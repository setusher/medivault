// Run: node scripts/link-chats.top-level.js
const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const TARGET_UID = "rohan";          // <-- the UID you created
const CHATS_COLLECTION = "chats";    // <-- change if yours differs

async function main() {
  // Strategy: scan all chats and set userId where missing/incorrect
  const stream = db.collection(CHATS_COLLECTION).stream();
  const refs = [];
  for await (const snap of stream) {
    const data = snap.data() || {};
    if (!data.userId || data.userId !== TARGET_UID) {
      refs.push(snap.ref);
    }
  }
  console.log(`Found ${refs.length} chat(s) to update.`);

  const BATCH_LIMIT = 500;
  let batch = db.batch();
  let count = 0;

  for (const ref of refs) {
    batch.update(ref, { userId: TARGET_UID });
    count++;
    if (count % BATCH_LIMIT === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`Committed ${count} updates...`);
    }
  }
  if (count % BATCH_LIMIT !== 0) await batch.commit();

  console.log(`Done. Linked ${count} chat(s) to "${TARGET_UID}".`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
