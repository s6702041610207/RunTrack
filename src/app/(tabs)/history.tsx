import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader from "@/components/app-header";
import RunMap from "@/components/run-map";
import { PawTrackColors, PawTrackPalette } from "@/constants/theme";
import useRuns from "@/hooks/use-runs";
import { usePawTrackColorScheme } from "@/hooks/use-theme-preference";
import { deleteRun } from "@/lib/runs-api";
import {
  ACTIVITY_META,
  computeSplits,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  regionForPath,
  Run,
  Split,
  summarizeRuns,
} from "@/utils/geo";

export default function HistoryScreen() {
  const { runs, loading, error } = useRuns();
  const [selected, setSelected] = useState<Run | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const scheme = usePawTrackColorScheme();
  const colors = PawTrackColors[scheme];

  const summary = useMemo(() => summarizeRuns(runs), [runs]);

  // react-native-web ไม่มี Alert.alert แบบ dialog จริง (ปุ่มใน callback จะไม่ถูกเรียกเลย)
  // เลยต้องแยกไปใช้ window.confirm บน web แทน ส่วนมือถือใช้ Alert.alert ตามปกติ
  const confirmDelete = (run: Run) => {
    const runDelete = async () => {
      setDeletingId(run.id);
      try {
        await deleteRun(run.id);
        setSelected(null);
      } catch {
        if (Platform.OS === "web") {
          window.alert("ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        } else {
          Alert.alert("ลบไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("ต้องการลบรายการนี้ใช่ไหม?")) {
        runDelete();
      }
      return;
    }

    Alert.alert("ลบประวัติการวิ่ง", "ต้องการลบรายการนี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: runDelete },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="ประวัติการวิ่ง" />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.pet} />
          <Text style={[styles.centerStateText, { color: colors.textSecondary }]}>
            กำลังโหลดข้อมูล...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={28} color={colors.textSecondary} />
          <Text style={[styles.centerStateText, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      ) : runs.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="walk-outline" size={28} color={colors.textSecondary} />
          <Text style={[styles.centerStateText, { color: colors.textSecondary }]}>
            ยังไม่มีประวัติการวิ่ง — ลองบันทึกครั้งแรกจากแท็บ "บันทึก"
          </Text>
        </View>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            gap: 10,
          }}
          ListHeaderComponent={
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>สรุปสถิติภาพรวม</Text>
              <View style={styles.summaryRow}>
                <SummaryStat
                  label="สัปดาห์นี้"
                  value={formatDistance(summary.weekDistanceMeters)}
                  hint={`${summary.weekCount} ครั้ง`}
                  colors={colors}
                />
                <SummaryStat
                  label="เดือนนี้"
                  value={formatDistance(summary.monthDistanceMeters)}
                  hint={`${summary.monthCount} ครั้ง`}
                  colors={colors}
                />
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <SummaryStat
                  label="วิ่ง/เดินไกลสุด"
                  value={summary.longestRun ? formatDistance(summary.longestRun.distanceMeters) : "-"}
                  colors={colors}
                />
                <SummaryStat
                  label="เพซเร็วสุด"
                  value={
                    summary.fastestRun
                      ? formatPace(summary.fastestRun.distanceMeters, summary.fastestRun.durationSeconds)
                      : "-"
                  }
                  colors={colors}
                />
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const meta = ACTIVITY_META[item.activityType];
            return (
              <Pressable
                onPress={() => setSelected(item)}
                accessibilityRole="button"
                accessibilityLabel={`ดูรายละเอียดการ${meta.label}วันที่ ${item.startedAt}`}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.petSoft }]}>
                  <MaterialCommunityIcons
                    name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={20}
                    color={colors.pet}
                  />
                </View>
                <View style={styles.textGroup}>
                  <Text style={[styles.date, { color: colors.textPrimary }]}>
                    {new Date(item.startedAt).toLocaleString("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {formatDistance(item.distanceMeters)} • {formatDuration(item.durationSeconds)} •{" "}
                    {formatPace(item.distanceMeters, item.durationSeconds)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <RunDetail
            run={selected}
            colors={colors}
            insetsTop={insets.top}
            deleting={deletingId === selected.id}
            onClose={() => setSelected(null)}
            onDelete={() => confirmDelete(selected)}
          />
        )}
      </Modal>
    </View>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  colors,
}: {
  label: string;
  value: string;
  hint?: string;
  colors: PawTrackPalette;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
        {label}
        {hint ? ` • ${hint}` : ""}
      </Text>
    </View>
  );
}

function RunDetail({
  run,
  colors,
  insetsTop,
  deleting,
  onClose,
  onDelete,
}: {
  run: Run;
  colors: PawTrackPalette;
  insetsTop: number;
  deleting: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const splits = useMemo(() => computeSplits(run.path), [run.path]);

  return (
    <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.detailHeader, { paddingTop: insetsTop + 12 }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          รายละเอียดการ{ACTIVITY_META[run.activityType].label}
        </Text>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="ปิด">
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.detailMap}>
        <RunMap path={run.path} initialRegion={regionForPath(run.path)} />
      </View>

      <View style={styles.detailStats}>
        <Stat label="ระยะทาง" value={formatDistance(run.distanceMeters)} colors={colors} />
        <Stat label="เวลา" value={formatDuration(run.durationSeconds)} colors={colors} />
        <Stat label="เพซเฉลี่ย" value={formatPace(run.distanceMeters, run.durationSeconds)} colors={colors} />
        <Stat label="ความสูงสะสม" value={formatElevation(run.elevationGainMeters)} colors={colors} />
      </View>

      {splits.length > 0 && <SplitsRow splits={splits} colors={colors} />}

      <Pressable
        onPress={onDelete}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="ลบรายการนี้"
        style={[styles.deleteButton, { backgroundColor: colors.dangerSoft, opacity: deleting ? 0.6 : 1 }]}
      >
        {deleting ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <Ionicons name="trash" size={16} color={colors.danger} />
            <Text style={[styles.deleteButtonText, { color: colors.danger }]}>ลบรายการนี้</Text>
          </>
        )}
      </Pressable>
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

function SplitsRow({ splits, colors }: { splits: Split[]; colors: PawTrackPalette }) {
  // หา split เต็มกิโลที่เร็วที่สุด ไว้ไฮไลต์ (ไม่เอา split เศษสุดท้ายมาเทียบ เพราะระยะไม่เท่ากัน เทียบกันไม่แฟร์)
  const fastestFullSplit = splits
    .filter((s) => !s.isPartial)
    .reduce<Split | null>((fastest, s) => {
      if (!fastest) return s;
      return s.durationSeconds < fastest.durationSeconds ? s : fastest;
    }, null);

  return (
    <View style={styles.splitsSection}>
      <Text style={[styles.splitsTitle, { color: colors.textSecondary }]}>Split เวลาต่อกิโล</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.splitsRow}>
        {splits.map((split) => {
          const isFastest = fastestFullSplit !== null && split === fastestFullSplit;
          return (
            <View
              key={split.index}
              style={[
                styles.splitChip,
                {
                  backgroundColor: isFastest ? colors.petSoft : colors.surface,
                  borderColor: isFastest ? colors.pet : colors.border,
                },
              ]}
            >
              <Text style={[styles.splitChipLabel, { color: colors.textSecondary }]}>
                {split.isPartial ? `กม. ${split.index} (เศษ)` : `กม. ${split.index}`}
              </Text>
              <Text style={[styles.splitChipValue, { color: isFastest ? colors.pet : colors.textPrimary }]}>
                {formatDuration(split.durationSeconds)}
              </Text>
              {split.isPartial && (
                <Text style={[styles.splitChipSub, { color: colors.textSecondary }]}>
                  {formatDistance(split.distanceMeters)}
                </Text>
              )}
              {isFastest && (
                <Ionicons name="flash" size={12} color={colors.pet} style={styles.splitChipIcon} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
  },
  summaryStat: {
    flex: 1,
    gap: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  date: {
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  centerStateText: {
    fontSize: 13,
    textAlign: "center",
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  detailMap: {
    flex: 1,
  },
  detailStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
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
  splitsSection: {
    marginBottom: 16,
  },
  splitsTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  splitsRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  splitChip: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 76,
  },
  splitChipLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  splitChipValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  splitChipSub: {
    fontSize: 10,
  },
  splitChipIcon: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 48,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
