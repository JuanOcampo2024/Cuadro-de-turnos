// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDfI4Us58hdJU1WC42RNxu68e7Z2p9GePk",
  authDomain: "turnosapp-2dc4b.firebaseapp.com",
  projectId: "turnosapp-2dc4b",
  storageBucket: "turnosapp-2dc4b.firebasestorage.app",
  messagingSenderId: "828431806395",
  appId: "1:828431806395:web:d75e27ff3621bb0d555e9e",
  measurementId: "G-RQNF1R0M7P"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firestore
const db = getFirestore(app);

export { db };
