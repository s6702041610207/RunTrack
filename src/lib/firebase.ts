import { Platform } from "react-native";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";

// ค่า config ของ Firebase project — เป็น "public" client config ตามปกติของ Firebase
// (ไม่ใช่ secret key, ปลอดภัยที่จะฝังในแอป client) แต่ยังคงอ่านจาก .env
// เพื่อให้สลับ project (dev/prod) ได้โดยไม่ต้องแก้โค้ด
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

// ยังไม่ตั้งค่า .env ก็ไม่ควร crash แอปทั้งหมด — ปล่อยให้ผู้เรียกไปเช็ค
// isFirebaseConfigured แล้วแสดง fallback UI เอง (ดู use-runs.ts)
let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // React Native (Hermes) มักต่อ Firestore ผ่าน WebChannel สตรีมปกติไม่ได้
  // (เจอ error แบบ "Could not reach Cloud Firestore backend") ต้องบังคับ long-polling แทน
  // ฝั่ง web ไม่ต้องการ workaround นี้ ใช้ getFirestore ปกติได้เลย
  dbInstance =
    Platform.OS === "web"
      ? getFirestore(app)
      : initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true,
        });
}

export const db = dbInstance;

export const RUNS_COLLECTION = "runs";
