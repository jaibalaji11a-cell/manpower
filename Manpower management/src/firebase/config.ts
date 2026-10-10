// ============================================================
// Firebase Configuration for ManPower CBE
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Select your "manpower-cbe" project
// 3. Click the gear icon → Project Settings → Scroll to "Your apps"
// 4. Click the </> (Web) icon → Register app → Copy the firebaseConfig
// 5. Replace the values below with your actual config
// ============================================================

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD8sEoLpkNN3LKCKtKU3HXxD9j2XSHahJQ",
  authDomain: "manpower-management-48948.firebaseapp.com",
  projectId: "manpower-management-48948",
  storageBucket: "manpower-management-48948.firebasestorage.app",
  messagingSenderId: "477272778270",
  appId: "1:477272778270:web:9047162cf8124c397e700f",
  measurementId: "G-T66402FNE9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Secondary app instance for creating users without switching current login session
const secondaryApp = getApps().find((a: any) => a.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
export const secondaryAuth = getAuth(secondaryApp);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
