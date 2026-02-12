import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDl_yqMROizlV-ZPqMe_iKMXmuuIIlv4dg",
  authDomain: "controle-horas-grupos.firebaseapp.com",
  projectId: "controle-horas-grupos",
  storageBucket: "controle-horas-grupos.firebasestorage.app",
  messagingSenderId: "1073442278187",
  appId: "1:1073442278187:web:45fb1e311f683a5c0f536e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
