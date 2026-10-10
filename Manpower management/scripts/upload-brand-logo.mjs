/**
 * Find attached logo image file and convert to base64 Data URL, then update Firestore settings/business
 * Run: node scripts/upload-brand-logo.mjs
 */

import fs from 'fs';
import path from 'path';

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

function findImageFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          // Skip node_modules and .git
          if (!file.startsWith('.') && file !== 'node_modules') {
            results = results.concat(findImageFiles(filePath));
          }
        } else {
          if (/\.(png|jpg|jpeg|webp)$/i.test(file)) {
            results.push({ path: filePath, mtime: stat.mtimeMs, size: stat.size });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

async function main() {
  console.log('🔍 Searching for attached logo image file...');
  
  // Search in Gemini appDataDir and workspace
  const appDataDir = 'C:\\Users\\ELCOT\\.gemini';
  const workspaceDir = 'd:\\Manpower management';

  const appDataImages = findImageFiles(appDataDir);
  const workspaceImages = findImageFiles(workspaceDir);

  const allImages = [...appDataImages, ...workspaceImages].sort((a, b) => b.mtime - a.mtime);

  console.log(`Found ${allImages.length} image files. Recent images:`);
  for (const img of allImages.slice(0, 10)) {
    console.log(` - ${img.path} (${(img.size / 1024).toFixed(1)} KB, mtime: ${new Date(img.mtime).toISOString()})`);
  }

  if (allImages.length === 0) {
    console.error('❌ No image files found!');
    process.exit(1);
  }

  const targetImage = allImages[0];
  console.log(`\n📸 Selected target logo image: ${targetImage.path}`);

  const buffer = fs.readFileSync(targetImage.path);
  const ext = path.extname(targetImage.path).substring(1).toLowerCase();
  const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const base64Str = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Str}`;

  console.log(`Data URL length: ${dataUrl.length} characters`);

  // Save copy to public/logo.png
  const publicLogoPath = path.join(workspaceDir, 'public', 'logo.png');
  fs.writeFileSync(publicLogoPath, buffer);
  console.log(`Saved logo copy to: ${publicLogoPath}`);

  // Also update Firestore settings/business logoUrl field
  const token = await signIn();
  console.log('Signed in to Firebase');

  const patchRes = await fetch(`${FIRESTORE_BASE}/settings/business?updateMask.fieldPaths=logoUrl`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fields: {
        logoUrl: { stringValue: dataUrl },
      },
    }),
  });

  const resJson = await patchRes.json();
  if (resJson.error) {
    console.error('❌ Firestore update failed:', resJson.error.message);
  } else {
    console.log('✅ Successfully updated Firestore settings/business with the new brand logo!');
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
