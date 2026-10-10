/**
 * Debug: Check why invoices are not showing in the app
 * Run: node scripts/debug-invoices.mjs
 */

const PROJECT_ID = 'manpower-management-48948';
const API_KEY = 'AIzaSyD8sEoLpkNN3LKCKtKU3HXxD9j2XSHahJQ';
const ADMIN_EMAIL = 'jaibalaji11a@gmail.com';
const ADMIN_PASSWORD = 'likejb11';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

async function signIn() {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) throw new Error('Sign-in failed');
  return data.idToken;
}

async function main() {
  const token = await signIn();
  console.log('✅ Signed in\n');

  // Fetch all invoices
  const res = await fetch(`${FIRESTORE_BASE}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (!data.documents || data.documents.length === 0) {
    console.log('❌ No invoices found at all in Firestore!');
    return;
  }

  console.log(`Found ${data.documents.length} invoice(s):\n`);
  for (const doc of data.documents) {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    console.log(`📄 Document ID: ${id}`);
    console.log(`   invoiceNo: ${JSON.stringify(fields.invoiceNo)}`);
    console.log(`   clientName: ${JSON.stringify(fields.clientName)}`);
    console.log(`   status: ${JSON.stringify(fields.status)}`);
    console.log(`   createdAt: ${JSON.stringify(fields.createdAt)}`);
    console.log('');
  }

  // Now fix: patch each invoice to add a proper Firestore server timestamp
  console.log('\n🔧 Fixing createdAt field on all invoices...');
  for (const doc of data.documents) {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const createdAt = fields.createdAt;

    // If createdAt is missing or is a string/number (not a proper timestamp), fix it
    const needsFix = !createdAt || createdAt.stringValue !== undefined || createdAt.integerValue !== undefined;

    if (needsFix) {
      // Use Firebase REST API to write a server timestamp
      const patchRes = await fetch(
        `${FIRESTORE_BASE}/invoices/${id}?updateMask.fieldPaths=createdAt`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            fields: {
              createdAt: { timestampValue: new Date().toISOString() },
            },
          }),
        }
      );
      const result = await patchRes.json();
      if (result.error) {
        console.log(`   ❌ Failed to fix ${id}: ${result.error.message}`);
      } else {
        console.log(`   ✅ Fixed createdAt for invoice ${id} (${fields.invoiceNo?.stringValue || '?'})`);
      }
    } else {
      console.log(`   ✅ Invoice ${id} already has correct createdAt`);
    }
  }

  console.log('\n✅ Done! Refresh the app - invoices should now appear.');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
