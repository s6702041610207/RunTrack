import { Stack } from "expo-router";

import { DemoModeProvider } from "@/hooks/use-demo-mode";
import { ThemePreferenceProvider } from "@/hooks/use-theme-preference";

export default function Layout() {
  return (
    <ThemePreferenceProvider>
      <DemoModeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        </Stack>
      </DemoModeProvider>
    </ThemePreferenceProvider>
  );
}
