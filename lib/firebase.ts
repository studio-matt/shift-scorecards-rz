import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyD_FPvDabLJFkD_fecfKQJw8YFptLEIxgQ",
  authDomain: "shift-fe6e9.firebaseapp.com",
  projectId: "shift-fe6e9",
  storageBucket: "shift-fe6e9.appspot.com",
  messagingSenderId: "160061885682",
  appId: "1:160061885682:web:d01a65e90002974936146b",
  measurementId: "G-8SE0NCEGE9",
}

// Initialize Firebase (prevent duplicate init in dev with HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// NOTE: Firebase Performance Monitoring disabled due to network errors
// To re-enable, uncomment the following:
// import { getPerformance, type FirebasePerformance } from "firebase/performance"
// let perf: FirebasePerformance | null = null
// if (typeof window !== "undefined") {
//   try { perf = getPerformance(app) } catch (err) { console.warn("Perf init failed:", err) }
// }
// export const performance = perf

export default app
