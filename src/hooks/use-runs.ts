import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { db, isFirebaseConfigured, RUNS_COLLECTION } from "@/lib/firebase";
import { Run } from "@/utils/geo";

type State = {
  runs: Run[];
  loading: boolean;
  error: string | null;
};

// subscribe แบบ real-time เข้ากับ Firestore collection "runs" เรียงจากล่าสุดไปเก่าสุด
export default function useRuns() {
  const [state, setState] = useState<State>({ runs: [], loading: true, error: null });

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setState({
        runs: [],
        loading: false,
        error: "ยังไม่ได้ตั้งค่า Firebase — ดูวิธีตั้งค่าใน .env",
      });
      return;
    }

    const q = query(collection(db, RUNS_COLLECTION), orderBy("startedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // เอกสารเก่าที่บันทึกไว้ก่อนมี activityType/elevationGainMeters จะไม่มี field พวกนี้
        // — ใส่ค่า default กันพังตอน render (เช่น ACTIVITY_META[undefined])
        const runs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            activityType: data.activityType ?? "run",
            elevationGainMeters: data.elevationGainMeters ?? 0,
          } as Run;
        });
        setState({ runs, loading: false, error: null });
      },
      (error) => {
        console.error("Firestore error:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "โหลดข้อมูลจาก Firestore ไม่สำเร็จ",
        }));
      }
    );

    return unsubscribe;
  }, []);

  return state;
}
