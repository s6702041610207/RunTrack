import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader from "@/components/app-header";
import RunMap from "@/components/run-map";
import { PawTrackColors, PawTrackPalette } from "@/constants/theme";
import { useDemoMode } from "@/hooks/use-demo-mode";
import useLocation from "@/hooks/use-location";
import useRunTracker from "@/hooks/use-run-tracker";
import useRuns from "@/hooks/use-runs";
import { usePawTrackColorScheme } from "@/hooks/use-theme-preference";
import { saveRun } from "@/lib/runs-api";
import {
  ACTIVITY_META,
  ActivityType,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  summarizeRuns,
} from "@/utils/geo";

const DEFAULT_REGION = {
  latitude: 13.7563,
  longitude: 100.5018,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const ACTIVITY_TYPES: ActivityType[] = ["run", "cycle"];

export default function TrackScreen() {
  const insets = useSafeAreaInsets();
  const scheme = usePawTrackColorScheme();
  const colors = PawTrackColors[scheme];
  const { location } = useLocation();
  const { enabled: demoModeEnabled } = useDemoMode();
  const { runs } = useRuns();
  const tracker = useRunTracker();
  const [saving, setSaving] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("run");

  // กันหน้าจอดับระหว่างวิ่ง — จำเป็นเพราะ Expo Go ติดตามตำแหน่งตอนแอปอยู่เบื้องหลัง/จอดับไม่ได้
  useKeepAwake();

  const summary = useMemo(() => summarizeRuns(runs), [runs]);

  const initialRegion = location
    ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  const handleStart = () => tracker.start(activityType);

  // โหมดสาธิต — จำลองการวิ่งวนรอบด้วย GPS ปลอม ไว้ present จากคอม/เว็บโดยไม่ต้องวิ่งจริง
  const handleStartDemo = () =>
    tracker.start(activityType, {
      demo: true,
      demoOrigin: location
        ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
        : undefined,
    });

  const handleStop = async () => {
    const runSummary = tracker.stop();
    if (!runSummary) {
      tracker.reset();
      return;
    }

    setSaving(true);
    try {
      await saveRun(runSummary);
      Alert.alert(
        "บันทึกแล้ว",
        `ระยะทาง ${formatDistance(runSummary.distanceMeters)} • เวลา ${formatDuration(runSummary.durationSeconds)}`
      );
    } catch {
      Alert.alert(
        "บันทึกไม่สำเร็จ",
        "ข้อมูลนี้จะหายไป กรุณาลองใหม่อีกครั้ง (เช็คการเชื่อมต่อ Firebase)"
      );
    } finally {
      setSaving(false);
      tracker.reset();
    }
  };

  // ก่อนเริ่ม (idle) — โชว์สรุปสถิติ + เลือกประเภทกิจกรรม แทนแผนที่เปล่าๆ เต็มจอ
  if (tracker.status === "idle") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="บันทึกการวิ่ง" subtitle="กดเริ่มเพื่อบันทึกเส้นทางวิ่ง/เดินของคุณ" />

        <View style={styles.idleBody}>
          <View style={[styles.weekCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.weekCardTitle, { color: colors.textSecondary }]}>สัปดาห์นี้</Text>
            <View style={styles.weekCardRow}>
              <View>
                <Text style={[styles.weekCardValue, { color: colors.textPrimary }]}>
                  {formatDistance(summary.weekDistanceMeters)}
                </Text>
                <Text style={[styles.weekCardLabel, { color: colors.textSecondary }]}>
                  {summary.weekCount} ครั้ง
                </Text>
              </View>
              <Ionicons name="stats-chart" size={28} color={colors.pet} />
            </View>
          </View>

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>เลือกกิจกรรม</Text>
          <View style={styles.activityRow}>
            {ACTIVITY_TYPES.map((type) => {
              const active = activityType === type;
              const meta = ACTIVITY_META[type];
              return (
                <Pressable
                  key={type}
                  onPress={() => setActivityType(type)}
                  accessibilityRole="button"
                  accessibilityLabel={meta.label}
                  style={[
                    styles.activityOption,
                    {
                      backgroundColor: active ? colors.petSoft : colors.surface,
                      borderColor: active ? colors.pet : colors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={24}
                    color={active ? colors.pet : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.activityOptionText,
                      { color: active ? colors.pet : colors.textSecondary },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tracker.errorMsg && (
            <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{tracker.errorMsg}</Text>
            </View>
          )}

          <Pressable
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="เริ่มบันทึก"
            style={({ pressed }) => [
              styles.startButton,
              {
                backgroundColor: colors.pet,
                opacity: pressed ? 0.9 : 1,
                marginBottom: demoModeEnabled ? 0 : insets.bottom + 12,
              },
            ]}
          >
            <Ionicons name="play" size={28} color="#fff" />
            <Text style={styles.startButtonText}>เริ่ม{ACTIVITY_META[activityType].label}</Text>
          </Pressable>

          {demoModeEnabled && (
            <Pressable
              onPress={handleStartDemo}
              accessibilityRole="button"
              accessibilityLabel="ทดลองสาธิตโดยไม่ต้องวิ่งจริง"
              style={({ pressed }) => [
                styles.demoButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceMuted,
                  opacity: pressed ? 0.85 : 1,
                  marginBottom: insets.bottom + 12,
                },
              ]}
            >
              <Ionicons name="sparkles-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.demoButtonText, { color: colors.textSecondary }]}>
                โหมดสาธิต (ไม่ต้องวิ่งจริง)
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // กำลังวิ่ง/พัก — โชว์แผนที่ + เส้นทาง + สถิติสด
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.trackingHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.trackingTitle, { color: colors.textPrimary }]}>
          กำลัง{ACTIVITY_META[activityType].label}
        </Text>
        {tracker.isDemo && (
          <View style={[styles.autoPauseBadge, { backgroundColor: colors.petSoft }]}>
            <Ionicons name="sparkles" size={14} color={colors.pet} />
            <Text style={[styles.autoPauseText, { color: colors.pet }]}>โหมดสาธิต — จำลอง GPS</Text>
          </View>
        )}
        {tracker.isAutoPaused && (
          <View style={[styles.autoPauseBadge, { backgroundColor: colors.assetSoft }]}>
            <Ionicons name="pause-circle" size={14} color={colors.asset} />
            <Text style={[styles.autoPauseText, { color: colors.asset }]}>พักอัตโนมัติ (ไม่มีการเคลื่อนที่)</Text>
          </View>
        )}
      </View>

      {tracker.errorMsg && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{tracker.errorMsg}</Text>
        </View>
      )}

      <View style={styles.mapSection}>
        <RunMap path={tracker.path} initialRegion={initialRegion} />
      </View>

      <View
        style={[
          styles.statsSheet,
          { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.statsRow}>
          <Stat label="ระยะทาง" value={formatDistance(tracker.distanceMeters)} colors={colors} />
          <Stat label="เวลา" value={formatDuration(tracker.elapsedSeconds)} colors={colors} />
          <Stat
            label="เพซเฉลี่ย"
            value={formatPace(tracker.distanceMeters, tracker.elapsedSeconds)}
            colors={colors}
          />
          <Stat
            label="ความสูงสะสม"
            value={formatElevation(tracker.elevationGainMeters)}
            colors={colors}
          />
        </View>

        <View style={styles.controls}>
          {tracker.status === "running" && (
            <>
              <ControlButton
                label="หยุดชั่วคราว"
                icon="pause"
                backgroundColor={colors.surfaceMuted}
                textColor={colors.textPrimary}
                onPress={tracker.pause}
              />
              <ControlButton
                label="จบการวิ่ง"
                icon="stop"
                backgroundColor={colors.danger}
                onPress={handleStop}
                disabled={saving}
              />
            </>
          )}
          {tracker.status === "paused" && (
            <>
              <ControlButton
                label="วิ่งต่อ"
                icon="play"
                backgroundColor={colors.pet}
                onPress={tracker.resume}
              />
              <ControlButton
                label="จบการวิ่ง"
                icon="stop"
                backgroundColor={colors.danger}
                onPress={handleStop}
                disabled={saving}
              />
            </>
          )}
        </View>

        {saving && <ActivityIndicator color={colors.pet} style={styles.savingIndicator} />}
      </View>
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: PawTrackPalette }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function ControlButton({
  label,
  icon,
  backgroundColor,
  textColor = "#fff",
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  textColor?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.controlButton,
        { backgroundColor, opacity: disabled ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      <Ionicons name={icon} size={18} color={textColor} />
      <Text style={[styles.controlButtonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  idleBody: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
  },
  weekCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  weekCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  weekCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weekCardValue: {
    fontSize: 26,
    fontWeight: "700",
  },
  weekCardLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  activityRow: {
    flexDirection: "row",
    gap: 10,
  },
  activityOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 44,
  },
  activityOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  startButton: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    minHeight: 56,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  demoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  trackingHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
  },
  trackingTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  autoPauseBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  autoPauseText: {
    fontSize: 12,
    fontWeight: "600",
  },
  mapSection: {
    flex: 0.5,
    overflow: "hidden",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  statsSheet: {
    flex: 0.5,
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  stat: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
  },
  controls: {
    flexDirection: "row",
    gap: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 48,
  },
  controlButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  savingIndicator: {
    marginTop: 12,
  },
});
