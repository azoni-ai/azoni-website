import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCwAemduEmk58XsdvNXKa9EDphRm_xHpOQ",
  authDomain: "azoni-ai-7abdd.firebaseapp.com",
  projectId: "azoni-ai-7abdd",
  storageBucket: "azoni-ai-7abdd.firebasestorage.app",
  messagingSenderId: "903911545007",
  appId: "1:903911545007:web:cec595d26d3058c9f29c5a",
  measurementId: "G-VSTYTS3KL1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;