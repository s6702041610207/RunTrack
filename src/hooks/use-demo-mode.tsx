import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "pawtrack.demoModeEnabled";

type ContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const DemoModeContext = createContext<ContextValue | null>(null);

// เปิด/ปิดโหมดสาธิต (จำลอง GPS ไว้ present โดยไม่ต้องวิ่งจริง) — ตั้งค่าไว้ในหน้าตั้งค่า
// ไม่โชว์ปุ่มโหมดสาธิตในหน้าบันทึกจนกว่าจะเปิดสวิตช์นี้ก่อน
export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "true") setEnabledState(true);
    });
  }, []);

  const setEnabled = (next: boolean) => {
    setEnabledState(next);
    AsyncStorage.setItem(STORAGE_KEY, next ? "true" : "false").catch(() => {});
  };

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled]);

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    throw new Error("useDemoMode ต้องใช้ภายใน DemoModeProvider");
  }
  return ctx;
}
