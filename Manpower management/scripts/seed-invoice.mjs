/**
 * Seed Script: Enter invoice data from user's Excel sheet into Firestore
 * Run: node scripts/seed-invoice.mjs
 *
 * This script:
 * 1. Signs in as admin to get an ID token
 * 2. Creates/finds the client in Firestore
 * 3. Creates the invoice with all 29 line items
 * 4. Creates the payment record (Partially Paid - advance already recorded)
 */

const PROJECT_ID = 'manpower-management-48948';
const API_KEY = 'AIzaSyD8sEoLpkNN3LKCKtKU3HXxD9j2XSHahJQ';
const ADMIN_EMAIL = 'jaibalaji11a@gmail.com';
const ADMIN_PASSWORD = 'likejb11';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

// ─── SIGN IN ────────────────────────────────────────────────────────────────
async function signIn() {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) throw new Error('Sign-in failed: ' + JSON.stringify(data));
  console.log('✅ Signed in as', ADMIN_EMAIL);
  return data.idToken;
}

// ─── FIRESTORE HELPERS ───────────────────────────────────────────────────────
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return { fields };
}

async function firestoreAdd(token, collection, data) {
  const url = `${FIRESTORE_BASE}/${collection}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(toFirestoreDoc(data)),
  });
  const result = await res.json();
  if (result.error) throw new Error(`Firestore error (${collection}): ${JSON.stringify(result.error)}`);
  return result;
}

async function firestoreSet(token, docPath, data) {
  const url = `${FIRESTORE_BASE}/${docPath}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(toFirestoreDoc(data)),
  });
  const result = await res.json();
  if (result.error) throw new Error(`Firestore set error (${docPath}): ${JSON.stringify(result.error)}`);
  return result;
}

async function firestoreQuery(token, collection, fieldPath, value) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath },
          op: 'EQUAL',
          value: toFirestoreValue(value),
        },
      },
      limit: 1,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const results = await res.json();
  if (!Array.isArray(results)) throw new Error('Query error: ' + JSON.stringify(results));
  const found = results.find(r => r.document);
  return found ? found.document : null;
}

// ─── THE INVOICE DATA ────────────────────────────────────────────────────────
// Client name (will be created if not found)
const CLIENT_NAME = 'Elgi Equipments';

// All line items from the user's data
const LINE_ITEMS = [
  { date: '2026-06-13', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-06-14', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-06-15', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-06-15', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-06-16', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-06-18', workType: 'Helper', shift: 'Day', manpower: 5, rate: 850, amount: 4250 },
  { date: '2026-06-19', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-06-20', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-06-22', workType: 'Helper', shift: 'Day', manpower: 1, rate: 850, amount: 850 },
  { date: '2026-06-23', workType: 'Helper', shift: 'Day', manpower: 1, rate: 850, amount: 850 },
  { date: '2026-06-26', workType: 'Helper', shift: 'Day', manpower: 1, rate: 850, amount: 850 },
  { date: '2026-06-28', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-06-30', workType: 'Helper', shift: 'Day', manpower: 4, rate: 850, amount: 3400 },
  { date: '2026-07-01', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-07-01', workType: 'Elgi Unloading', shift: 'Day', manpower: 1, rate: 850, amount: 850 },
  { date: '2026-07-03', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-07-04', workType: 'Helper', shift: 'Day', manpower: 1, rate: 850, amount: 850 },
  { date: '2026-07-04', workType: 'Elgi Unloading', shift: 'Day', manpower: 1, rate: 850, amount: 850 },
  { date: '2026-07-05', workType: 'Helper', shift: 'Day', manpower: 5, rate: 850, amount: 4250 },
  { date: '2026-07-07', workType: 'Helper', shift: 'Day', manpower: 2, rate: 850, amount: 1700 },
  { date: '2026-07-07', workType: 'Shifting Work', shift: 'Day', manpower: 6, rate: 950, amount: 5700 },
  { date: '2026-07-08', workType: 'Helper + OT', shift: 'OT',  manpower: 9, rate: 850, amount: 7650 },
  { date: '2026-07-09', workType: 'Helper', shift: 'Day', manpower: 4, rate: 850, amount: 3400 },
  { date: '2026-07-09', workType: 'Helper + OT', shift: 'OT',  manpower: 9, rate: 850, amount: 7650 },
  { date: '2026-07-10', workType: 'Helper', shift: 'Day', manpower: 4, rate: 850, amount: 3400 },
  { date: '2026-07-10', workType: 'Helper + OT', shift: 'OT',  manpower: 8, rate: 850, amount: 6800 },
  { date: '2026-07-11', workType: 'Helper', shift: 'Day', manpower: 6, rate: 850, amount: 5100 },
  { date: '2026-07-12', workType: 'Helper', shift: 'Day', manpower: 5, rate: 850, amount: 4250 },
  { date: '2026-07-13', workType: 'Helper', shift: 'Day', manpower: 3, rate: 850, amount: 2550 },
];

// Add IDs to line items
LINE_ITEMS.forEach((item, i) => {
  item.id = `li-${Date.now()}-${i}`;
  item.location = '';
});

const SUBTOTAL = LINE_ITEMS.reduce((s, li) => s + li.amount, 0);
const TOTAL_MANPOWER = LINE_ITEMS.reduce((s, li) => s + li.manpower, 0);
const GRAND_TOTAL = SUBTOTAL; // No GST

// Summary totals from user data
console.log('\n📊 Invoice Summary:');
console.log(`   Line items: ${LINE_ITEMS.length}`);
console.log(`   Total Manpower: ${TOTAL_MANPOWER}`);
console.log(`   Subtotal: ₹${SUBTOTAL.toLocaleString('en-IN')}`);
console.log(`   Grand Total: ₹${GRAND_TOTAL.toLocaleString('en-IN')}`);
console.log(`   (Expected: ₹80,500 per user data — ${SUBTOTAL === 80500 ? '✅ MATCH' : '⚠️ MISMATCH, calculated: ' + SUBTOTAL})`);

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const token = await signIn();

  // Step 1: Find or create client
  console.log(`\n🔍 Looking for client: "${CLIENT_NAME}"...`);
  let clientId, clientDoc;
  
  clientDoc = await firestoreQuery(token, 'clients', 'name', CLIENT_NAME);
  
  if (clientDoc) {
    clientId = clientDoc.name.split('/').pop();
    console.log(`✅ Found existing client: ${clientId}`);
  } else {
    console.log(`➕ Creating new client: "${CLIENT_NAME}"...`);
    const newClient = {
      name: CLIENT_NAME,
      contactPerson: '',
      mobile: '',
      email: '',
      gst: '',
      address: 'Coimbatore, Tamil Nadu',
      deleted: false,
    };
    const created = await firestoreAdd(token, 'clients', newClient);
    clientId = created.name.split('/').pop();
    console.log(`✅ Client created: ${clientId}`);
  }

  // Step 2: Generate invoice number
  const invoiceNo = `MP-2026-001`;
  console.log(`\n📄 Creating invoice ${invoiceNo}...`);

  const invoice = {
    invoiceNo,
    invoiceDate: '2026-07-13',
    clientId,
    clientName: CLIENT_NAME,
    clientAddress: 'Coimbatore, Tamil Nadu',
    workPeriodFrom: '2026-06-13',
    workPeriodTo: '2026-07-13',
    paymentTerms: 'Due on Receipt',
    dueDate: '2026-07-13',
    lineItems: LINE_ITEMS,
    totalManpower: TOTAL_MANPOWER,
    subtotal: SUBTOTAL,
    gstPercent: 0,
    gstAmount: 0,
    grandTotal: GRAND_TOTAL,
    bankDetailsSnapshot: {
      accountName: '',
      accountNo: '',
      ifsc: '',
      bankName: '',
      branch: '',
      upiId: '',
    },
    qrEnabled: false,
    signatureUrl: '',
    status: 'Partially Paid',
  };

  const invDoc = await firestoreAdd(token, 'invoices', invoice);
  const invoiceId = invDoc.name.split('/').pop();
  console.log(`✅ Invoice created: ${invoiceId}`);

  // Step 3: Create payment record
  // Total: 128,500 (including Shifting 45,000 + Helper 80,500 + Elgi 3,000)
  // But invoice is for Helper + Elgi items only = 80,500 as per this invoice
  // Advance paid: 55,770 (after deductions)
  const ADVANCE_PAID = 55770;
  const BALANCE = GRAND_TOTAL - ADVANCE_PAID; // 80,500 - 55,770 = 24,730
  
  console.log(`\n💰 Creating payment record...`);
  console.log(`   Invoice Total: ₹${GRAND_TOTAL.toLocaleString('en-IN')}`);
  console.log(`   Advance Paid: ₹${ADVANCE_PAID.toLocaleString('en-IN')}`);
  console.log(`   Balance: ₹${BALANCE.toLocaleString('en-IN')}`);

  const payment = {
    invoiceId,
    invoiceNo,
    clientId,
    clientName: CLIENT_NAME,
    invoiceAmount: GRAND_TOTAL,
    paidTotal: ADVANCE_PAID,
    balance: BALANCE,
    dueDate: '2026-07-13',
    status: 'Partially Paid',
    paymentLog: [
      {
        date: '2026-07-13',
        amount: ADVANCE_PAID,
        mode: 'Cash',
        reference: 'Advance payment (58,000 - 1,180 hydraulic palette - 1,050 transport)',
      },
    ],
  };

  await firestoreAdd(token, 'payments', payment);
  console.log(`✅ Payment record created`);

  console.log('\n🎉 All data entered successfully!');
  console.log(`\n   Invoice No: ${invoiceNo}`);
  console.log(`   Client: ${CLIENT_NAME}`);
  console.log(`   Period: 13 Jun 2026 – 13 Jul 2026`);
  console.log(`   Total: ₹${GRAND_TOTAL.toLocaleString('en-IN')}`);
  console.log(`   Paid (Advance): ₹${ADVANCE_PAID.toLocaleString('en-IN')}`);
  console.log(`   Balance Due: ₹${BALANCE.toLocaleString('en-IN')}`);
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
