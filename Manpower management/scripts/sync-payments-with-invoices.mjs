/**
 * Fix & Sync all payment documents with actual invoice amounts
 * Run: node scripts/sync-payments-with-invoices.mjs
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

  // 1. Fetch all invoices
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
      id,
      invoiceNo: val(f.invoiceNo),
      clientId: val(f.clientId),
      clientName: val(f.clientName),
      grandTotal: Number(val(f.grandTotal) || 0),
      dueDate: val(f.dueDate) || '',
    };
  }

  // 2. Fetch all payments
  const payRes = await fetch(`${FIRESTORE_BASE}/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payData = await payRes.json();
  const payments = payData.documents || [];

  console.log(`🔄 Syncing ${payments.length} payment record(s) with real invoice totals...\n`);

  for (const doc of payments) {
    const payDocId = doc.name.split('/').pop();
    const f = doc.fields || {};
    const invoiceId = val(f.invoiceId);
    const oldAmount = Number(val(f.invoiceAmount) || 0);
    const paidTotal = Number(val(f.paidTotal) || 0);

    const inv = invoiceMap[invoiceId];
    if (!inv) {
      console.log(`⚠️ Payment ${payDocId} has no matching invoice (${invoiceId})`);
      continue;
    }

    const newInvoiceAmount = inv.grandTotal;
    const newBalance = Math.max(0, newInvoiceAmount - paidTotal);
    const newStatus = derivePaymentStatus(paidTotal, newInvoiceAmount, inv.dueDate);

    console.log(`📄 Invoice: ${inv.invoiceNo} (${inv.clientName})`);
    console.log(`   Old Invoice Amount: ₹${oldAmount}  ->  New Invoice Amount: ₹${newInvoiceAmount}`);
    console.log(`   Paid Total:         ₹${paidTotal}`);
    console.log(`   New Balance:        ₹${newBalance}`);
    console.log(`   New Status:         ${newStatus}`);

    const patchRes = await fetch(
      `${FIRESTORE_BASE}/payments/${payDocId}?updateMask.fieldPaths=invoiceAmount&updateMask.fieldPaths=balance&updateMask.fieldPaths=status&updateMask.fieldPaths=invoiceNo&updateMask.fieldPaths=clientName&updateMask.fieldPaths=dueDate`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fields: {
            invoiceAmount: { integerValue: String(newInvoiceAmount) },
            balance: { integerValue: String(newBalance) },
            status: { stringValue: newStatus },
            invoiceNo: { stringValue: inv.invoiceNo },
            clientName: { stringValue: inv.clientName },
            dueDate: { stringValue: inv.dueDate },
          },
        }),
      }
    );

    const result = await patchRes.json();
    if (result.error) {
      console.log(`❌ Failed to update payment ${payDocId}: ${result.error.message}`);
    } else {
      console.log(`✅ Synced payment ${payDocId} successfully!`);
    }
    console.log('');
  }

  console.log('🎉 All payment records synced!');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
