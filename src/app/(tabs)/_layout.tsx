import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { PawTrackColors } from "@/constants/theme";
import { usePawTrackColorScheme } from "@/hooks/use-theme-preference";

export default function TabsLayout() {
  const scheme = usePawTrackColorScheme();
  const colors = PawTrackColors[scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pet,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "บันทึก",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "ประวัติ",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
