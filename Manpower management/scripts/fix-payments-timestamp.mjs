/**
 * Fix: Patch missing createdAt on payments collection
 * Run: node scripts/fix-payments-timestamp.mjs
 */

const PROJECT_ID = 'manpower-management-48948';
const API_KEY = 'AIzaSyD8sEoLpkNN3LKCKtKU3HXxD9j2XSHahJQ';
const ADMIN_EMAIL = 'jaibalaji11a@gmail.com';
const ADMIN_PASSWORD = 'likejb11';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

async function signIn() {
  const res = await fetch(AUTH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }) });
  const data = await res.json();
  if (!data.idToken) throw new Error('Sign-in failed');
  return data.idToken;
}

async function main() {
  const token = await signIn();
  console.log('✅ Signed in');

  for (const col of ['payments', 'clients']) {
    const res = await fetch(`${FIRESTORE_BASE}/${col}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!data.documents) { console.log(`   No docs in ${col}`); continue; }

    console.log(`\n📦 ${col}: ${data.documents.length} document(s)`);
    for (const doc of data.documents) {
      const id = doc.name.split('/').pop();
      const fields = doc.fields || {};
      const createdAt = fields.createdAt;
      const needsFix = !createdAt || createdAt.stringValue !== undefined || createdAt.integerValue !== undefined;

      if (needsFix) {
        const patchRes = await fetch(
          `${FIRESTORE_BASE}/${col}/${id}?updateMask.fieldPaths=createdAt`,
          { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ fields: { createdAt: { timestampValue: new Date().toISOString() } } }) }
        );
        const result = await patchRes.json();
        if (result.error) console.log(`   ❌ ${id}: ${result.error.message}`);
        else console.log(`   ✅ Fixed createdAt for ${id}`);
      } else {
        console.log(`   ✅ ${id} already OK`);
      }
    }
  }
  console.log('\n✅ All done! Refresh the app.');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
