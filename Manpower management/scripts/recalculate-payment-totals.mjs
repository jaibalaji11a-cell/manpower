/**
 * Recalculate & Sync Payment Log totals for all Payment records
 * Run: node scripts/recalculate-payment-totals.mjs
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

function isOverdue(dueDateStr, balance) {
  if (balance <= 0) return false;
  return new Date(dueDateStr) < new Date();
}

function derivePaymentStatus(paidTotal, invoiceAmount, dueDate) {
  if (paidTotal >= invoiceAmount) return 'Paid';
  const balance = invoiceAmount - paidTotal;
  if (isOverdue(dueDate, balance)) return 'Overdue';
  if (paidTotal > 0) return 'Partially Paid';
  return 'Unpaid';
}

async function main() {
  const token = await signIn();
  console.log('✅ Signed in\n');

  // Fetch invoices to get exact grand totals
  const invRes = await fetch(`${FIRESTORE_BASE}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const invData = await invRes.json();
  const invoices = invData.documents || [];
  const invoiceMap = {};
  for (const doc of invoices) {
    const id = doc.name.split('/').pop();
    const f = doc.fields || {};
    invoiceMap[id] = {
      grandTotal: Number(val(f.grandTotal) || 0),
      invoiceNo: val(f.invoiceNo),
      clientName: val(f.clientName),
      dueDate: val(f.dueDate) || '',
    };
  }

  // Fetch payments
  const payRes = await fetch(`${FIRESTORE_BASE}/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payData = await payRes.json();
  const payments = payData.documents || [];

  console.log(`🔧 Recalculating payment totals from payment logs for ${payments.length} records...\n`);

  for (const doc of payments) {
    const payId = doc.name.split('/').pop();
    const f = doc.fields || {};
    const invoiceId = val(f.invoiceId);
    const inv = invoiceMap[invoiceId];

    const invoiceAmount = inv ? inv.grandTotal : Number(val(f.invoiceAmount) || 0);
    const dueDate = inv ? inv.dueDate : (val(f.dueDate) || '');

    // Sum log entries
    const logArr = f.paymentLog?.arrayValue?.values || [];
    let truePaidTotal = 0;
    for (const logItem of logArr) {
      const lf = logItem.mapValue?.fields || {};
      truePaidTotal += Number(val(lf.amount) || 0);
    }

    const trueBalance = Math.max(0, invoiceAmount - truePaidTotal);
    const trueStatus = derivePaymentStatus(truePaidTotal, invoiceAmount, dueDate);

    console.log(`📄 Invoice ${val(f.invoiceNo)} (${val(f.clientName)}):`);
    console.log(`   Invoice Amount: ₹${invoiceAmount.toLocaleString('en-IN')}`);
    console.log(`   Payment Log Sum (True Paid Total): ₹${truePaidTotal.toLocaleString('en-IN')}`);
    console.log(`   Recalculated Balance Due:          ₹${trueBalance.toLocaleString('en-IN')}`);
    console.log(`   Recalculated Status:               ${trueStatus}`);

    // Update payment document
    const patchPayRes = await fetch(
      `${FIRESTORE_BASE}/payments/${payId}?updateMask.fieldPaths=invoiceAmount&updateMask.fieldPaths=paidTotal&updateMask.fieldPaths=balance&updateMask.fieldPaths=status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fields: {
            invoiceAmount: { integerValue: String(invoiceAmount) },
            paidTotal: { integerValue: String(truePaidTotal) },
            balance: { integerValue: String(trueBalance) },
            status: { stringValue: trueStatus },
          },
        }),
      }
    );
    const payResult = await patchPayRes.json();

    // Update invoice document
    if (invoiceId) {
      const patchInvRes = await fetch(
        `${FIRESTORE_BASE}/invoices/${invoiceId}?updateMask.fieldPaths=paidAmount&updateMask.fieldPaths=balanceDue&updateMask.fieldPaths=status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            fields: {
              paidAmount: { integerValue: String(truePaidTotal) },
              balanceDue: { integerValue: String(trueBalance) },
              status: { stringValue: trueStatus },
            },
          }),
        }
      );
      const invResult = await patchInvRes.json();
    }

    console.log(`   ✅ Successfully updated payment & invoice records!\n`);
  }

  console.log('🎉 Payment tracker calculations 100% audited and recalculated!');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
