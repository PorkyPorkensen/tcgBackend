import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

if (!admin.apps.length) {
  let firebaseConfig;
  const key = process.env.FIREBASE_ADMIN_KEY;
  if (key?.trim().startsWith("{")) {
    // JSON string in env var (Render)
    firebaseConfig = JSON.parse(key);
  } else {
    // File path in env var (local)
    firebaseConfig = JSON.parse(fs.readFileSync(key, "utf8"));
  }

  admin.initializeApp({
    credential: cert(firebaseConfig),
  });
}

const db = getFirestore();
export { db };