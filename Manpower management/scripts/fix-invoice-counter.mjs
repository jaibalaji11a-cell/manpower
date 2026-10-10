/**
 * Fix Script: Reset invoice counter to match actual saved invoices
 * Run: node scripts/fix-invoice-counter.mjs
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
  if (!data.idToken) throw new Error('Sign-in failed: ' + JSON.stringify(data));
  return data.idToken;
}

async function main() {
  const token = await signIn();
  console.log('✅ Signed in');

  // Count actual invoices in Firestore
  const invoicesRes = await fetch(`${FIRESTORE_BASE}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const invoicesData = await invoicesRes.json();
  const invoiceCount = invoicesData.documents ? invoicesData.documents.length : 0;
  console.log(`📄 Actual invoices saved in DB: ${invoiceCount}`);

  // List them
  if (invoicesData.documents) {
    for (const d of invoicesData.documents) {
      const no = d.fields?.invoiceNo?.stringValue || '(no number)';
      const client = d.fields?.clientName?.stringValue || '';
      const total = d.fields?.grandTotal?.doubleValue || d.fields?.grandTotal?.integerValue || 0;
      console.log(`   → ${no}  |  ${client}  |  ₹${Number(total).toLocaleString('en-IN')}`);
    }
  }

  // Reset counter to invoiceCount so next invoice = invoiceCount + 1
  const year = new Date().getFullYear();
  const correctCount = invoiceCount;

  const patchRes = await fetch(
    `${FIRESTORE_BASE}/settings/business?updateMask.fieldPaths=invoiceCounter`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fields: {
          invoiceCounter: {
            mapValue: {
              fields: {
                [`${year}`]: { integerValue: String(correctCount) },
              },
            },
          },
        },
      }),
    }
  );

  const result = await patchRes.json();
  if (result.error) throw new Error('PATCH failed: ' + JSON.stringify(result.error));

  console.log(`\n✅ Counter reset to ${correctCount}`);
  console.log(`   Next new invoice will be: MP-${year}-${String(correctCount + 1).padStart(3, '0')}`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
