import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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

// Export services so they can be used in your components
export const db = getFirestore(app);
export const storage = getStorage(app);