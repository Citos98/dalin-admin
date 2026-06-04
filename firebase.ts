import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// BURAYI FIREBASE'DEN KOPYALADIGIN KENDI BILGILERINLE DEGISTIR
const firebaseConfig = {
  apiKey: "AIzaSyBCeIcnALE-eSRhie-lZ8rW-a6CD0zvhac",
  authDomain: "dalin-tracking.firebaseapp.com",
  projectId: "dalin-tracking",
  storageBucket: "dalin-tracking.firebasestorage.app",
  messagingSenderId: "922746103059",
  appId: "1:922746103059:web:9ff174846277c7fbe6a6e6",
  measurementId: "G-MWMVN4X8MG"
};

// Firebase'i baslat
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);