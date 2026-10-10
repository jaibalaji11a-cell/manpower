/**
 * Patch all invoice documents in Firestore to store paidAmount and balanceDue
 * Run: node scripts/patch-invoice-paid-amounts.mjs
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

  // 1. Fetch payments to get paidTotal for each invoiceId
  const payRes = await fetch(`${FIRESTORE_BASE}/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payData = await payRes.json();
  const payments = payData.documents || [];

  const paymentMap = {};
  for (const doc of payments) {
    const f = doc.fields || {};
    const invoiceId = val(f.invoiceId);
    const paidTotal = Number(val(f.paidTotal) || 0);
    const balance = Number(val(f.balance) || 0);
    paymentMap[invoiceId] = { paidTotal, balance };
  }

  // 2. Fetch invoices
  const invRes = await fetch(`${FIRESTORE_BASE}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const invData = await invRes.json();
  const invoices = invData.documents || [];

  console.log(`📄 Patching ${invoices.length} invoice document(s) with paidAmount & balanceDue...\n`);

  for (const doc of invoices) {
    const invId = doc.name.split('/').pop();
    const f = doc.fields || {};
    const no = val(f.invoiceNo);
    const client = val(f.clientName);
    const grandTotal = Number(val(f.grandTotal) || 0);

    const payInfo = paymentMap[invId] || { paidTotal: 0, balance: grandTotal };
    const paidAmount = payInfo.paidTotal;
    const balanceDue = Math.max(0, grandTotal - paidAmount);

    console.log(`   Invoice: ${no} (${client})`);
    console.log(`      Grand Total: ₹${grandTotal}`);
    console.log(`      Paid Amount: ₹${paidAmount}`);
    console.log(`      Balance Due: ₹${balanceDue}`);

    const patchRes = await fetch(
      `${FIRESTORE_BASE}/invoices/${invId}?updateMask.fieldPaths=paidAmount&updateMask.fieldPaths=balanceDue`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fields: {
            paidAmount: { integerValue: String(paidAmount) },
            balanceDue: { integerValue: String(balanceDue) },
          },
        }),
      }
    );

    const result = await patchRes.json();
    if (result.error) {
      console.log(`   ❌ Patch failed: ${result.error.message}`);
    } else {
      console.log(`   ✅ Successfully patched ${no}!`);
    }
    console.log('');
  }

  console.log('🎉 All invoice documents patched with paidAmount and balanceDue!');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
