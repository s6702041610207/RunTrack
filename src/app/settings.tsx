import { ScrollView, StyleSheet, Switch, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PawTrackColors } from "@/constants/theme";
import { useDemoMode } from "@/hooks/use-demo-mode";
import {
  ThemePreference,
  usePawTrackColorScheme,
  useThemePreference,
} from "@/hooks/use-theme-preference";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "ตามระบบ", icon: "phone-portrait-outline" },
  { value: "light", label: "สว่าง", icon: "sunny-outline" },
  { value: "dark", label: "มืด", icon: "moon-outline" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const scheme = usePawTrackColorScheme();
  const colors = PawTrackColors[scheme];
  const { preference, setPreference } = useThemePreference();
  const { enabled: demoModeEnabled, setEnabled: setDemoModeEnabled } = useDemoMode();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>ตั้งค่า</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="ปิด"
          hitSlop={8}
          style={[styles.closeButton, { backgroundColor: colors.surfaceMuted }]}
        >
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* ธีม */}
      <Section title="ธีม" colors={colors}>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => {
            const active = preference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPreference(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: active ? colors.petSoft : colors.surfaceMuted,
                    borderColor: active ? colors.pet : colors.border,
                  },
                ]}
              >
                <Ionicons name={opt.icon} size={20} color={active ? colors.pet : colors.textSecondary} />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: active ? colors.pet : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* เกี่ยวกับแอป */}
      <Section title="เกี่ยวกับแอป" colors={colors}>
        <Text style={[styles.appName, { color: colors.textPrimary }]}>Run Tracker</Text>
        <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
          แอปบันทึกเส้นทางวิ่ง/ปั่นจักรยาน ด้วย GPS และ Google Maps — วัดระยะทาง
          เวลา เพซเฉลี่ย และความสูงสะสมระหว่างกิจกรรม
          {"\n\n"}
          หมายเหตุ: การติดตามทำงานเฉพาะตอนเปิดแอปอยู่หน้าจอเท่านั้น
          (ยังไม่รองรับการบันทึกขณะล็อกหน้าจอ/สลับแอป)
        </Text>
        <Text style={[styles.version, { color: colors.textSecondary }]}>เวอร์ชัน 1.0.0</Text>
      </Section>

      {/* โหมดสาธิต — ซ่อนไว้ในนี้ ไว้ present ตอนไม่ได้วิ่งจริง (จำลอง GPS วนเส้นทาง) */}
      <Section title="ขั้นสูง" colors={colors}>
        <View style={styles.demoRow}>
          <View style={styles.demoRowText}>
            <Text style={[styles.demoRowTitle, { color: colors.textPrimary }]}>โหมดสาธิต</Text>
            <Text style={[styles.demoRowDescription, { color: colors.textSecondary }]}>
              จำลองการวิ่งด้วย GPS ปลอม ไว้ present จากคอม/เว็บ โดยไม่ต้องวิ่งจริง เปิดแล้วจะมีปุ่ม
              "โหมดสาธิต" โผล่ในหน้าบันทึก
            </Text>
          </View>
          <Switch
            value={demoModeEnabled}
            onValueChange={setDemoModeEnabled}
            trackColor={{ true: colors.pet, false: colors.border }}
          />
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: (typeof PawTrackColors)["light"] | (typeof PawTrackColors)["dark"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 44,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  appDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  version: {
    fontSize: 12,
  },
  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  demoRowText: {
    flex: 1,
    gap: 4,
  },
  demoRowTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  demoRowDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
});
