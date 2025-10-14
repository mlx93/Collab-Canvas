// Firebase initialization with hybrid database setup
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app); // Firestore for persistent data
export const rtdb = getDatabase(app); // Realtime Database for ephemeral data

// Connect to emulators in development mode
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true') {
  console.log('🔧 Connecting to Firebase Emulators...');
  
  // Connect Auth Emulator
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  
  // Connect Firestore Emulator
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  
  // Connect Realtime Database Emulator
  connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
  
  console.log('✅ Connected to Firebase Emulators');
  console.log('   - Auth: http://127.0.0.1:9099');
  console.log('   - Firestore: http://127.0.0.1:8080');
  console.log('   - RTDB: http://127.0.0.1:9000');
  console.log('   - Emulator UI: http://127.0.0.1:4000');
}

export default app;

