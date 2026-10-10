/**
 * Inspect invoice details in Firestore
 * Run: node scripts/inspect-invoices.mjs
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

  const res = await fetch(`${FIRESTORE_BASE}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (!data.documents || data.documents.length === 0) {
    console.log('❌ No invoices found in Firestore!');
    return;
  }

  console.log(`Found ${data.documents.length} invoice(s):\n`);
  for (const doc of data.documents) {
    console.log(JSON.stringify(doc, null, 2));
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
