/**
 * Check mismatch between invoices and payments collection
 * Run: node scripts/check-payments-mismatch.mjs
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

function val(f) {
  if (!f) return undefined;
  return f.stringValue ?? f.integerValue ?? f.doubleValue ?? f.booleanValue;
}

async function main() {
  const token = await signIn();
  console.log('✅ Signed in\n');

  // Fetch all invoices
  const invRes = await fetch(`${FIRESTORE_BASE}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const invData = await invRes.json();
  const invoices = invData.documents || [];

  // Fetch all payments
  const payRes = await fetch(`${FIRESTORE_BASE}/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payData = await payRes.json();
  const payments = payData.documents || [];

  console.log(`📄 INVOICES (${invoices.length}):`);
  const invoiceMap = {};
  for (const doc of invoices) {
    const id = doc.name.split('/').pop();
    const f = doc.fields || {};
    const no = val(f.invoiceNo);
    const client = val(f.clientName);
    const grandTotal = Number(val(f.grandTotal) || 0);
    invoiceMap[id] = { id, no, client, grandTotal, doc };
    console.log(`   ID: ${id} | ${no} | ${client} | Grand Total: ₹${grandTotal}`);
  }

  console.log(`\n💳 PAYMENTS (${payments.length}):`);
  for (const doc of payments) {
    const id = doc.name.split('/').pop();
    const f = doc.fields || {};
    const invoiceId = val(f.invoiceId);
    const no = val(f.invoiceNo);
    const client = val(f.clientName);
    const invAmount = Number(val(f.invoiceAmount) || 0);
    const paidTotal = Number(val(f.paidTotal) || 0);
    const balance = Number(val(f.balance) || 0);

    const matchingInv = invoiceMap[invoiceId];
    console.log(`   ID: ${id} | InvID: ${invoiceId} | ${no} | ${client}`);
    console.log(`      Payment Doc Invoice Amount: ₹${invAmount}`);
    console.log(`      Payment Doc Paid Total:      ₹${paidTotal}`);
    console.log(`      Payment Doc Balance:         ₹${balance}`);

    if (matchingInv) {
      console.log(`      Actual Invoice Grand Total: ₹${matchingInv.grandTotal}`);
      if (invAmount !== matchingInv.grandTotal) {
        console.log(`      ⚠️ MISMATCH FOUND! Payment doc has ₹${invAmount}, but Invoice has ₹${matchingInv.grandTotal}`);
      } else {
        console.log(`      ✅ Invoice amount matches`);
      }
    } else {
      console.log(`      ⚠️ No matching invoice doc found for invoiceId ${invoiceId}`);
    }
    console.log('');
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
