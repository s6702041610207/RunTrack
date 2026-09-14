import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "pawtrack.themePreference";

type ContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  // ธีมที่ใช้จริงหลังรวม preference กับค่าธีมของระบบแล้ว
  colorScheme: "light" | "dark";
};

const ThemePreferenceContext = createContext<ContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  // โหลดค่าที่ผู้ใช้เคยเลือกไว้จากเครื่อง (ถ้ามี) ตอนเปิดแอปครั้งแรก
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const colorScheme: "light" | "dark" =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const value = useMemo(
    () => ({ preference, setPreference, colorScheme }),
    [preference, colorScheme]
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error("useThemePreference ต้องใช้ภายใน ThemePreferenceProvider");
  }
  return ctx;
}

// ใช้แทน useColorScheme() ของ react-native ตรงๆ ในหน้าจอ/component ต่างๆ
// เพื่อให้ผลลัพธ์เคารพค่าที่ผู้ใช้ตั้งไว้ในหน้าตั้งค่าด้วย ไม่ใช่แค่ตามระบบอย่างเดียว
export function usePawTrackColorScheme(): "light" | "dark" {
  return useThemePreference().colorScheme;
}
