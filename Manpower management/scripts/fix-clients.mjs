/**
 * Diagnose & fix Clients collection issues
 * Run: node scripts/fix-clients.mjs
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

function val(field) {
  if (!field) return undefined;
  return field.stringValue ?? field.booleanValue ?? field.integerValue ?? field.doubleValue ?? field.timestampValue;
}

async function main() {
  const token = await signIn();
  console.log('✅ Signed in\n');

  // Fetch ALL clients (no filter)
  const res = await fetch(`${FIRESTORE_BASE}/clients`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (!data.documents || data.documents.length === 0) {
    console.log('❌ NO client documents found in Firestore at all!');
    console.log('   The clients collection is empty.\n');
    return;
  }

  console.log(`Found ${data.documents.length} client document(s):\n`);
  const problems = [];

  for (const doc of data.documents) {
    const id = doc.name.split('/').pop();
    const f = doc.fields || {};
    const name = val(f.name);
    const deleted = val(f.deleted);
    const createdAt = f.createdAt;

    console.log(`📋 ID: ${id}`);
    console.log(`   name:      ${name ?? '❌ MISSING'}`);
    console.log(`   deleted:   ${deleted ?? '❌ MISSING'}`);
    console.log(`   createdAt: ${createdAt ? JSON.stringify(createdAt) : '❌ MISSING'}`);
    console.log('');

    const fixes = {};
    let needsFix = false;

    // Fix: deleted field must be a boolean false (not missing)
    if (deleted === undefined || deleted === null) {
      fixes.deleted = { booleanValue: false };
      needsFix = true;
      console.log(`   ⚠️  "deleted" field missing — will set to false`);
    }

    // Fix: createdAt must be a timestamp
    if (!createdAt || createdAt.stringValue !== undefined || createdAt.integerValue !== undefined) {
      fixes.createdAt = { timestampValue: new Date().toISOString() };
      needsFix = true;
      console.log(`   ⚠️  "createdAt" is wrong type — will fix to timestamp`);
    }

    if (needsFix) {
      problems.push(id);
      const fieldMasks = Object.keys(fixes).map(k => `updateMask.fieldPaths=${k}`).join('&');
      const patchRes = await fetch(
        `${FIRESTORE_BASE}/clients/${id}?${fieldMasks}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fields: fixes }),
        }
      );
      const result = await patchRes.json();
      if (result.error) {
        console.log(`   ❌ Fix failed: ${result.error.message}`);
      } else {
        console.log(`   ✅ Fixed client: ${name || id}`);
      }
    } else {
      console.log(`   ✅ No issues`);
    }
    console.log('');
  }

  if (problems.length === 0) {
    console.log('✅ All client documents are healthy.');
    console.log('   If clients still do not show, the issue may be a missing Firestore composite index.');
    console.log('   Check the browser console for an error like "requires an index" and click the link to create it.');
  } else {
    console.log(`\n✅ Fixed ${problems.length} document(s). Refresh the app — clients should now appear.`);
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
