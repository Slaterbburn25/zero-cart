import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  projectId: "gen-lang-client-0008439812",
  appId: "1:613399497926:web:f1b12f88cab386f6065bc7",
  storageBucket: "gen-lang-client-0008439812.firebasestorage.app",
  apiKey: "AIzaSyDta-MrkgytYE-Yj18oSInMdEKxqBJgiUQ",
  authDomain: "gen-lang-client-0008439812.firebaseapp.com",
  messagingSenderId: "613399497926"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
}
