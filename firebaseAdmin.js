import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

if (!admin.apps.length) {
  // Read the file path from the env variable
  const serviceAccountPath = process.env.FIREBASE_ADMIN_KEY;
  const firebaseConfig = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  admin.initializeApp({
    credential: cert(firebaseConfig),
  });
}

const db = getFirestore();
export { db };
