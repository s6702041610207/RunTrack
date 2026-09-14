import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PawTrackColors } from "@/constants/theme";
import { usePawTrackColorScheme } from "@/hooks/use-theme-preference";

type Props = {
  title: string;
  subtitle?: string;
};

// หัวข้อของแต่ละแท็บ พร้อมปุ่ม hamburger มุมขวาเปิดหน้าตั้งค่า (แสดงเป็น modal ไม่ใช่แท็บ)
export default function AppHeader({ title, subtitle }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = usePawTrackColorScheme();
  const colors = PawTrackColors[scheme];
  const router = useRouter();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.textGroup}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>

      <Pressable
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel="เปิดเมนูตั้งค่า"
        hitSlop={8}
        style={({ pressed }) => [
          styles.menuButton,
          { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="menu" size={22} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  textGroup: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
