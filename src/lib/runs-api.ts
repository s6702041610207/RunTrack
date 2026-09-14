import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";

import { db, RUNS_COLLECTION } from "@/lib/firebase";
import { Run } from "@/utils/geo";

function requireDb() {
  if (!db) {
    throw new Error("Firebase ยังไม่ได้ตั้งค่า — ดูวิธีตั้งค่าใน .env");
  }
  return db;
}

export async function saveRun(run: Omit<Run, "id">) {
  await addDoc(collection(requireDb(), RUNS_COLLECTION), run);
}

export async function deleteRun(id: string) {
  await deleteDoc(doc(requireDb(), RUNS_COLLECTION, id));
}
