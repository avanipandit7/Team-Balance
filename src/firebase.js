import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDRjNAnT60VnppMJVOV95SVPzCH4ZImmwY",
  authDomain: "teambalance-cf525.firebaseapp.com",
  projectId: "teambalance-cf525",
  storageBucket: "teambalance-cf525.firebasestorage.app",
  messagingSenderId: "154440784413",
  appId: "1:154440784413:web:dc9c11e88c7cabf352c4f4",
  measurementId: "G-KTP5CFCMLP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable Firestore offline persistence for scaling and offline usability
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore offline persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      console.warn("Firestore offline persistence not supported by this browser.");
    }
  });
}

export default app;