import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
export { db };