/**
 * Comprehensive Audit & Analysis of Payment Tracker Calculations
 * Run: node scripts/analyze-payments.mjs
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
  console.log('===========================================================');
  console.log('📊 MANPOWER MANAGEMENT - PAYMENT TRACKER AUDIT REPORT');
  console.log('===========================================================\n');

  // 1. Fetch Invoices
  const invRes = await fetch(`${FIRESTORE_BASE}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const invData = await invRes.json();
  const invoices = invData.documents || [];

  // 2. Fetch Payments
  const payRes = await fetch(`${FIRESTORE_BASE}/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payData = await payRes.json();
  const payments = payData.documents || [];

  console.log(`📄 TOTAL INVOICES IN DB: ${invoices.length}`);
  console.log(`💳 TOTAL PAYMENT RECORDS IN DB: ${payments.length}\n`);

  let globalInvoicedTotal = 0;
  let globalCollectedTotal = 0;
  let globalBalanceTotal = 0;

  const invoiceMap = {};
  for (const doc of invoices) {
    const id = doc.name.split('/').pop();
    const f = doc.fields || {};
    const invoiceNo = val(f.invoiceNo);
    const clientName = val(f.clientName);
    const grandTotal = Number(val(f.grandTotal) || 0);
    const paidAmount = Number(val(f.paidAmount) || 0);
    const balanceDue = Number(val(f.balanceDue) || 0);
    const dueDate = val(f.dueDate) || '';
    const status = val(f.status) || 'Sent';

    // Calculate line items sum
    const lineItemsArr = f.lineItems?.arrayValue?.values || [];
    let calculatedLineItemsSum = 0;
    let calculatedManpowerSum = 0;

    for (const itemDoc of lineItemsArr) {
      const itemF = itemDoc.mapValue?.fields || {};
      const mp = Number(val(itemF.manpower) || 0);
      const rate = Number(val(itemF.rate) || 0);
      const amt = Number(val(itemF.amount) || 0);
      calculatedManpowerSum += mp;
      calculatedLineItemsSum += amt;
    }

    invoiceMap[id] = {
      id, invoiceNo, clientName, grandTotal, paidAmount, balanceDue, dueDate, status,
      calculatedLineItemsSum, calculatedManpowerSum, lineItemCount: lineItemsArr.length,
    };
  }

  // Analyze each payment document
  for (const doc of payments) {
    const payId = doc.name.split('/').pop();
    const f = doc.fields || {};
    const invoiceId = val(f.invoiceId);
    const invoiceNo = val(f.invoiceNo);
    const clientName = val(f.clientName);
    const invoiceAmount = Number(val(f.invoiceAmount) || 0);
    const paidTotal = Number(val(f.paidTotal) || 0);
    const balance = Number(val(f.balance) || 0);
    const dueDate = val(f.dueDate) || '';
    const status = val(f.status) || '';

    // Log entries
    const logArr = f.paymentLog?.arrayValue?.values || [];
    let calculatedLogSum = 0;
    const logEntries = [];
    for (const logItem of logArr) {
      const lf = logItem.mapValue?.fields || {};
      const amt = Number(val(lf.amount) || 0);
      const date = val(lf.date) || '';
      const mode = val(lf.mode) || '';
      const ref = val(lf.reference) || '';
      calculatedLogSum += amt;
      logEntries.push({ amt, date, mode, ref });
    }

    const expectedStatus = derivePaymentStatus(paidTotal, invoiceAmount, dueDate);
    const expectedBalance = Math.max(0, invoiceAmount - paidTotal);

    globalInvoicedTotal += invoiceAmount;
    globalCollectedTotal += paidTotal;
    globalBalanceTotal += balance;

    const matchingInv = invoiceMap[invoiceId];

    console.log(`-----------------------------------------------------------`);
    console.log(`🧾 INVOICE / PAYMENT: ${invoiceNo} (${clientName})`);
    console.log(`-----------------------------------------------------------`);
    console.log(`   Payment Doc ID:         ${payId}`);
    console.log(`   Invoice Doc ID:         ${invoiceId || 'N/A'}`);
    console.log(`   Invoice Grand Total:    ₹${invoiceAmount.toLocaleString('en-IN')}`);
    console.log(`   Paid Total Recorded:    ₹${paidTotal.toLocaleString('en-IN')}`);
    console.log(`   Log Entries Sum:        ₹${calculatedLogSum.toLocaleString('en-IN')}`);
    console.log(`   Balance Remaining:      ₹${balance.toLocaleString('en-IN')}`);
    console.log(`   Current Status:         ${status}`);
    console.log(`   Expected Status:        ${expectedStatus}`);
    console.log(`   Due Date:               ${dueDate}`);

    if (matchingInv) {
      console.log(`   Line Items Count:       ${matchingInv.lineItemCount}`);
      console.log(`   Total Manpower:         ${matchingInv.calculatedManpowerSum} workers`);
      console.log(`   Line Items Sum:         ₹${matchingInv.calculatedLineItemsSum.toLocaleString('en-IN')}`);
      if (matchingInv.grandTotal !== invoiceAmount) {
        console.log(`   ❌ MISMATCH: Invoice Grand Total (₹${matchingInv.grandTotal}) != Payment Invoice Amount (₹${invoiceAmount})`);
      } else {
        console.log(`   ✅ Invoice Grand Total matches Payment Record`);
      }
    }

    if (calculatedLogSum !== paidTotal && paidTotal > 0) {
      console.log(`   ⚠️ NOTICE: Log Entries Sum (₹${calculatedLogSum}) differs from Paid Total (₹${paidTotal}) [e.g. advance setting]`);
    } else {
      console.log(`   ✅ Payment Log Sum matches Paid Total`);
    }

    if (balance !== expectedBalance) {
      console.log(`   ❌ BALANCE ERROR: Balance (₹${balance}) != Expected Balance (₹${expectedBalance})`);
    } else {
      console.log(`   ✅ Balance math is correct`);
    }

    if (logEntries.length > 0) {
      console.log(`   📜 Payment Log History (${logEntries.length} entries):`);
      for (const e of logEntries) {
        console.log(`      • ${e.date}: ₹${e.amt.toLocaleString('en-IN')} via ${e.mode} ${e.ref ? `(Ref: ${e.ref})` : ''}`);
      }
    } else {
      console.log(`   📜 Payment Log History: Empty (No payments logged yet)`);
    }
    console.log('');
  }

  console.log('===========================================================');
  console.log('📈 GLOBAL PAYMENT TRACKER METRICS SUMMARY');
  console.log('===========================================================');
  console.log(`   Total Invoiced:   ₹${globalInvoicedTotal.toLocaleString('en-IN')}`);
  console.log(`   Total Collected:  ₹${globalCollectedTotal.toLocaleString('en-IN')}`);
  console.log(`   Total Balance Due: ₹${globalBalanceTotal.toLocaleString('en-IN')}`);
  console.log(`   Collection Rate:  ${globalInvoicedTotal > 0 ? ((globalCollectedTotal / globalInvoicedTotal) * 100).toFixed(1) : 0}%`);
  console.log('===========================================================\n');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
